import { randomUUID } from 'node:crypto';

import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportedJobAlerts } from '../../src/core/jobs/job-alerts.js';
import { captureSentryEvents } from '../support/sentry-capture.js';

describe('Job alerts reported to Sentry (TECH-10, NFR-OBS-03)', () => {
  const reported = captureSentryEvents();
  const alerts = new ReportedJobAlerts();

  beforeEach(() => {
    reported.length = 0;
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('reports a dead-lettered job with its queue and ID, grouped per queue and error type', async () => {
    const jobId = randomUUID();

    alerts.deadLettered(
      { queue: 'notifications.send', jobId },
      new Error('could not reach lucia.prueba@example.test'),
    );

    await expect.poll(() => reported).toHaveLength(1);
    expect(reported[0]).toMatchObject({
      exception: { values: [{ type: 'Error' }] },
      tags: { alert: 'dead_lettered', queue: 'notifications.send' },
      contexts: { job: { id: jobId } },
      fingerprint: ['dead_lettered', 'notifications.send', 'Error'],
    });
    expect(JSON.stringify(reported)).not.toContain('lucia.prueba');
  });

  it('reports work waiting over 2 minutes as one issue per source', async () => {
    alerts.lagging('outbox', 150);

    await expect.poll(() => reported).toHaveLength(1);
    expect(reported[0]).toMatchObject({
      level: 'error',
      message: 'outbox has work waiting for over 2 minutes',
      tags: { alert: 'lagging', source: 'outbox' },
      contexts: { lag: { waited_seconds: 150 } },
      fingerprint: ['lagging', 'outbox'],
    });
  });

  it('reports jobs waiting in the dead-letter queue as a warning', async () => {
    alerts.deadLettersWaiting(3);

    await expect.poll(() => reported).toHaveLength(1);
    expect(reported[0]).toMatchObject({
      level: 'warning',
      tags: { alert: 'dead_letters_waiting' },
      contexts: { dead_letters: { count: 3 } },
    });
  });

  it('reports a queue error', async () => {
    alerts.queueFailed(new Error('connection to lucia.prueba@example.test refused'));

    await expect.poll(() => reported).toHaveLength(1);
    expect(reported[0]).toMatchObject({ tags: { alert: 'queue_failed' } });
    expect(JSON.stringify(reported)).not.toContain('lucia.prueba');
  });
});
