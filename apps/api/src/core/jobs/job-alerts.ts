import { Logger } from '@nestjs/common';
import { captureException, captureMessage } from '@sentry/nestjs';

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

export class ReportedJobAlerts extends JobAlerts {
  private readonly logger = new Logger(JobAlerts.name);

  deadLettered({ queue, jobId }: DeadLetteredJob, error: unknown): void {
    this.logger.error(
      `Job ${jobId} on ${queue} failed its last attempt (${nameOf(error)}) and moved to the dead-letter queue`,
      framesOf(error),
    );
    captureException(error, {
      tags: { alert: 'dead_lettered', queue },
      contexts: { job: { id: jobId } },
      fingerprint: ['dead_lettered', queue, nameOf(error)],
    });
  }

  queueFailed(error: unknown): void {
    this.logger.error(`Job queue error (${nameOf(error)})`, framesOf(error));
    captureException(error, { tags: { alert: 'queue_failed' } });
  }

  lagging(source: string, waitedSeconds: number): void {
    this.logger.error(`${source} has work waiting for ${String(waitedSeconds)} s`);
    captureMessage(`${source} has work waiting for over 2 minutes`, {
      level: 'error',
      tags: { alert: 'lagging', source },
      contexts: { lag: { waited_seconds: waitedSeconds } },
      fingerprint: ['lagging', source],
    });
  }

  deadLettersWaiting(count: number): void {
    this.logger.error(`${String(count)} jobs are waiting in the dead-letter queue`);
    captureMessage('Jobs are waiting in the dead-letter queue', {
      level: 'warning',
      tags: { alert: 'dead_letters_waiting' },
      contexts: { dead_letters: { count } },
      fingerprint: ['dead_letters_waiting'],
    });
  }
}
