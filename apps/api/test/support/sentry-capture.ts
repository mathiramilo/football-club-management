import * as Sentry from '@sentry/nestjs';
import type { ErrorEvent } from '@sentry/nestjs';

import { sentryOptions } from '../../src/core/observability/sentry-options.js';

// Starts Sentry with the API's options, but keeps what it would send instead of sending it.
export function captureSentryEvents(): ErrorEvent[] {
  const events: ErrorEvent[] = [];
  const options = sentryOptions({
    SENTRY_DSN: 'https://public@sentry.example.test/1',
    SENTRY_ENVIRONMENT: 'test',
    SENTRY_TRACES_SAMPLE_RATE: 0,
  });
  Sentry.init({
    ...options,
    defaultIntegrations: false,
    beforeSend: (event, hint) => {
      const sent = options.beforeSend?.(event, hint) as ErrorEvent | null;
      if (sent) events.push(sent);
      return null;
    },
  });
  return events;
}
