import { Injectable } from '@nestjs/common';
import { PgBoss } from 'pg-boss';

import { JobAlerts } from './job-alerts.js';
import { JobHandler, jobQueue } from './job-queue.js';
import { DEAD_LETTER_QUEUE, JobWorkers } from './job-workers.js';

// NFR-OBS-03: alert when work has waited more than 2 minutes.
export const MAX_WAIT_SECONDS = 120;

export const checkQueues = jobQueue(
  'jobs.check_queues',
  {},
  { schedule: { cron: '* * * * *' }, retryLimit: 0 },
);

@Injectable()
export class JobMonitor {
  constructor(
    private readonly boss: PgBoss,
    private readonly workers: JobWorkers,
    private readonly alerts: JobAlerts,
  ) {}

  @JobHandler(checkQueues)
  async check(): Promise<void> {
    const queues = await this.boss.getQueues(this.workers.queueNames());
    for (const { name, readyOldestSeconds } of queues) {
      if (readyOldestSeconds !== null && readyOldestSeconds > MAX_WAIT_SECONDS) {
        this.alerts.lagging(name, readyOldestSeconds);
      }
    }
    const deadLetters = await this.boss.getQueue(DEAD_LETTER_QUEUE);
    if (deadLetters && deadLetters.queuedCount > 0) {
      this.alerts.deadLettersWaiting(deadLetters.queuedCount);
    }
  }
}
