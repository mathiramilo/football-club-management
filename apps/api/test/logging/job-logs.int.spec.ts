import { randomUUID } from 'node:crypto';

import { Injectable, Logger, Module } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { type JobData, JobHandler, jobQueue } from '../../src/core/jobs/job-queue.js';
import { Jobs } from '../../src/core/jobs/jobs.js';
import { LOG_STREAM } from '../../src/core/logging/logging.module.js';
import { LogCapture } from '../support/log-capture.js';
import { POLL_MS, startTestWorker, type TestWorker } from '../support/test-worker.js';

// The rest of the suite runs with logs off; this file reads them.
vi.hoisted(() => {
  process.env.LOG_LEVEL = 'info';
});

const announcement = jobQueue('test.announcement', { clubId: z.uuid() });

@Injectable()
class AnnouncementHandler {
  private readonly logger = new Logger(AnnouncementHandler.name);

  @JobHandler(announcement)
  announce(): void {
    this.logger.log('Announcement sent');
  }
}

@Module({ providers: [AnnouncementHandler] })
class AnnouncementModule {}

describe('Job logs (TECH-10, NFR-OBS-02)', { timeout: 30_000 }, () => {
  const logs = new LogCapture();
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await startTestWorker([AnnouncementModule], {
      customize: (builder) => builder.overrideProvider(LOG_STREAM).useValue(logs),
    });
  });

  afterAll(async () => {
    await worker.module.close();
  });

  it('tags what a job logs with the job ID and its queue', async () => {
    const clubId = randomUUID();
    const spy = worker.boss.getSpy<JobData<typeof announcement>>(announcement.name);

    await worker.module.get(Jobs).send(announcement, { clubId });
    await worker.clock.tick(POLL_MS);
    const job = await spy.waitForJob((data) => data.clubId === clubId, 'completed');

    expect(logs.lines).toContainEqual(
      expect.objectContaining({
        level: 'info',
        msg: 'Announcement sent',
        context: AnnouncementHandler.name,
        job_id: job.id,
        queue: announcement.name,
      }),
    );
  });
});
