import { randomUUID } from 'node:crypto';

import { Injectable, Module } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { JobMonitor } from '../../src/core/jobs/job-monitor.js';
import { type JobData, JobHandler, jobQueue } from '../../src/core/jobs/job-queue.js';
import { DEAD_LETTER_QUEUE } from '../../src/core/jobs/job-workers.js';
import { Jobs } from '../../src/core/jobs/jobs.js';
import { POLL_MS, startTestWorker } from '../support/test-worker.js';

const busy = jobQueue('test.busy', { clubId: z.uuid() });

@Injectable()
class BusyHandler {
  readonly started = Promise.withResolvers<undefined>();
  readonly released = Promise.withResolvers<undefined>();

  @JobHandler(busy)
  async work(): Promise<void> {
    this.started.resolve(undefined);
    await this.released.promise;
  }
}

@Module({ providers: [BusyHandler] })
class BusyModule {}

describe('Job monitor (NFR-OBS-03, TECH-07)', { timeout: 30_000 }, () => {
  it('alerts when a job has been ready for more than 2 minutes', async () => {
    const worker = await startTestWorker([BusyModule]);
    const handler = worker.module.get(BusyHandler);
    try {
      const jobs = worker.module.get(Jobs);
      await jobs.send(busy, { clubId: randomUUID() });
      await worker.clock.tick(POLL_MS);
      await handler.started.promise;
      await jobs.send(busy, { clubId: randomUUID() } satisfies JobData<typeof busy>);

      await worker.clock.tick(3 * 60_000);
      await worker.module.get(JobMonitor).check();

      expect(worker.alerts.lags.map(({ source }) => source)).toContain(busy.name);
    } finally {
      handler.released.resolve(undefined);
      await worker.module.close();
    }
  });

  it('alerts while jobs wait in the dead-letter queue (NFR-AVAIL-04)', async () => {
    const worker = await startTestWorker([]);
    try {
      await worker.boss.send(DEAD_LETTER_QUEUE, { clubId: randomUUID() });
      await worker.clock.tick(60_000);

      await vi.waitFor(async () => {
        await worker.module.get(JobMonitor).check();
        expect(worker.alerts.deadLettersWaitingCounts).toContain(1);
      });
    } finally {
      await worker.module.close();
    }
  });
});
