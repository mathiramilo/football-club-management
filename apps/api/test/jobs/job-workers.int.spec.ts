import { randomUUID } from 'node:crypto';

import { Injectable, Module } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { type JobData, JobHandler, jobQueue } from '../../src/core/jobs/job-queue.js';
import { DEAD_LETTER_QUEUE } from '../../src/core/jobs/job-workers.js';
import { Jobs } from '../../src/core/jobs/jobs.js';
import {
  createTestBoss,
  POLL_MS,
  startTestWorker,
  type TestWorker,
} from '../support/test-worker.js';

const greeting = jobQueue('test.greeting', { clubId: z.uuid() });
const reminder = jobQueue('test.reminder', { eventId: z.uuid() }, { policy: 'short' });
const fragile = jobQueue(
  'test.fragile',
  { marker: z.uuid() },
  { retryLimit: 1, retryDelaySeconds: 1 },
);
const nightly = jobQueue(
  'test.nightly',
  {},
  { schedule: { cron: '0 3 * * *', tz: 'America/Montevideo' } },
);

@Injectable()
class TestHandlers {
  readonly greeted: string[] = [];
  readonly reminded: string[] = [];
  fragileAttempts = 0;
  nightlyRuns = 0;

  @JobHandler(greeting)
  greet({ clubId }: JobData<typeof greeting>): void {
    this.greeted.push(clubId);
  }

  @JobHandler(reminder)
  remind({ eventId }: JobData<typeof reminder>): void {
    this.reminded.push(eventId);
  }

  @JobHandler(fragile)
  breakDown(): void {
    this.fragileAttempts += 1;
    throw new Error('lucia.prueba@example.test could not be reached');
  }

  @JobHandler(nightly)
  tidyUp(): void {
    this.nightlyRuns += 1;
  }
}

@Module({ providers: [TestHandlers] })
class TestHandlersModule {}

describe('Job workers (TECH-07)', { timeout: 30_000 }, () => {
  let worker: TestWorker;

  afterEach(async () => {
    await worker.module.close();
  });

  const handlers = () => worker.module.get(TestHandlers);
  const jobs = () => worker.module.get(Jobs);

  it('runs each job with the handler of its queue', async () => {
    worker = await startTestWorker([TestHandlersModule]);
    const clubId = randomUUID();
    const spy = worker.boss.getSpy<JobData<typeof greeting>>(greeting.name);

    await jobs().send(greeting, { clubId });
    await worker.clock.tick(POLL_MS);

    await spy.waitForJob((data) => data.clubId === clubId, 'completed');
    expect(handlers().greeted).toEqual([clubId]);
  });

  it('runs a job sent for later only once its time has come', async () => {
    worker = await startTestWorker([TestHandlersModule]);
    const clubId = randomUUID();
    const startAfter = new Date(worker.clock.now() + 10 * 60_000);
    const spy = worker.boss.getSpy<JobData<typeof greeting>>(greeting.name);

    await jobs().send(greeting, { clubId }, { startAfter });
    await worker.clock.tick(POLL_MS);
    expect(handlers().greeted).toEqual([]);

    await worker.clock.setTime(startAfter);
    await worker.clock.tick(POLL_MS);
    await spy.waitForJob((data) => data.clubId === clubId, 'completed');
    expect(handlers().greeted).toEqual([clubId]);
  });

  it('keeps one waiting job per key on a short queue (BR-NOTIF-03)', async () => {
    worker = await startTestWorker([TestHandlersModule]);
    const eventId = randomUUID();
    const later = { startAfter: new Date(worker.clock.now() + 60 * 60_000), singletonKey: eventId };

    await jobs().send(reminder, { eventId }, later);
    await jobs().send(reminder, { eventId }, later);

    await expect(worker.boss.findJobs(reminder.name, { key: eventId })).resolves.toHaveLength(1);
  });

  it('retries a failing job, then dead-letters it and raises an alert (NFR-AVAIL-04)', async () => {
    worker = await startTestWorker([TestHandlersModule]);
    const marker = randomUUID();

    await jobs().send(fragile, { marker });
    await worker.clock.tick(POLL_MS);
    await worker.clock.setTime(worker.clock.now() + 60_000);
    await worker.clock.tick(POLL_MS);

    await vi.waitFor(async () => {
      await expect(
        worker.boss.findJobs(DEAD_LETTER_QUEUE, { data: { marker } }),
      ).resolves.toHaveLength(1);
    });
    expect(handlers().fragileAttempts).toBe(2);
    expect(worker.alerts.deadLetters.map(({ queue }) => queue)).toEqual([fragile.name]);
  });

  it('stores the error name of a failed job, never its message', async () => {
    worker = await startTestWorker([TestHandlersModule]);
    const marker = randomUUID();

    await jobs().send(fragile, { marker });
    await worker.clock.tick(POLL_MS);
    await vi.waitFor(() => {
      expect(handlers().fragileAttempts).toBe(1);
    });

    const [job] = await worker.boss.findJobs(fragile.name, { data: { marker } });
    expect(JSON.stringify(job?.output)).toContain('JobFailure');
    expect(JSON.stringify(job?.output)).not.toContain('lucia.prueba');
  });

  it('never runs a handler with data its queue does not declare', async () => {
    worker = await startTestWorker([TestHandlersModule]);
    const clubId = randomUUID();

    await worker.boss.send(greeting.name, { clubId, name: 'Lucía' }, { retryLimit: 0 });
    await worker.clock.tick(POLL_MS);

    await vi.waitFor(() => {
      expect(worker.alerts.deadLetters.map(({ queue }) => queue)).toEqual([greeting.name]);
    });
    expect(handlers().greeted).toEqual([]);
  });

  it('gives every queue the default retries and the dead-letter queue (NFR-AVAIL-04)', async () => {
    worker = await startTestWorker([TestHandlersModule]);

    await expect(worker.boss.getQueue(greeting.name)).resolves.toMatchObject({
      policy: 'standard',
      retryLimit: 5,
      retryDelay: 30,
      retryBackoff: true,
      retryDelayMax: 900,
      deadLetter: DEAD_LETTER_QUEUE,
    });
  });

  it('schedules recurring queues in their time zone and drops retired schedules', async () => {
    const boss = createTestBoss();
    await boss.start();
    await boss.createQueue('test.retired');
    await boss.schedule('test.retired', '0 * * * *');

    worker = await startTestWorker([TestHandlersModule], undefined, boss);

    const schedules = await worker.boss.getSchedules();
    expect(schedules.map(({ name, cron, timezone }) => ({ name, cron, timezone }))).toEqual([
      { name: nightly.name, cron: '0 3 * * *', timezone: 'America/Montevideo' },
    ]);
  });
});

describe('Job worker lifecycle (TECH-07)', { timeout: 30_000 }, () => {
  it('refuse to start when two handlers claim the same queue', async () => {
    @Injectable()
    class DuplicateHandler {
      @JobHandler(greeting)
      greetAgain(): void {
        throw new Error('a worker with two handlers for one queue never starts');
      }
    }
    @Module({ providers: [DuplicateHandler] })
    class DuplicateModule {}

    await expect(startTestWorker([TestHandlersModule, DuplicateModule])).rejects.toThrow(
      'both handle the job queue test.greeting',
    );
  });

  it('lets a running job finish before it stops', async () => {
    const entered = Promise.withResolvers<undefined>();
    const released = Promise.withResolvers<undefined>();
    const finished: string[] = [];
    const slow = jobQueue('test.slow', { clubId: z.uuid() });

    @Injectable()
    class SlowHandler {
      @JobHandler(slow)
      async work({ clubId }: JobData<typeof slow>): Promise<void> {
        entered.resolve(undefined);
        await released.promise;
        finished.push(clubId);
      }
    }
    @Module({ providers: [SlowHandler] })
    class SlowModule {}

    const worker = await startTestWorker([SlowModule]);
    const clubId = randomUUID();
    await worker.module.get(Jobs).send(slow, { clubId });
    await worker.clock.tick(POLL_MS);
    await entered.promise;

    const stopping = worker.module.close();
    released.resolve(undefined);
    await stopping;

    expect(finished).toEqual([clubId]);
  });
});
