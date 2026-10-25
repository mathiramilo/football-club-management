import { Logger } from '@nestjs/common';

import { framesOf, nameOf } from '../errors/redacted-error.js';

export interface DeadLetteredJob {
  readonly queue: string;
  readonly jobId: string;
}

export abstract class JobAlerts {
  abstract deadLettered(job: DeadLetteredJob, error: unknown): void;
  abstract queueFailed(error: unknown): void;
  abstract lagging(source: string, waitedSeconds: number): void;
  abstract deadLettersWaiting(count: number): void;
}

// TODO(TECH-10): report these to Sentry as well.
export class LoggerJobAlerts extends JobAlerts {
  private readonly logger = new Logger(JobAlerts.name);

  deadLettered({ queue, jobId }: DeadLetteredJob, error: unknown): void {
    this.logger.error(
      `Job ${jobId} on ${queue} failed its last attempt (${nameOf(error)}) and moved to the dead-letter queue`,
      framesOf(error),
    );
  }

  queueFailed(error: unknown): void {
    this.logger.error(`Job queue error (${nameOf(error)})`, framesOf(error));
  }

  lagging(source: string, waitedSeconds: number): void {
    this.logger.error(`${source} has work waiting for ${String(waitedSeconds)} s`);
  }

  deadLettersWaiting(count: number): void {
    this.logger.error(`${String(count)} jobs are waiting in the dead-letter queue`);
  }
}
