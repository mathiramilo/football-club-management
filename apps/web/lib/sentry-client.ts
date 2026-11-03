import { init } from '@sentry/nextjs';

import { sentryOptions } from './sentry-options';

export function startSentry() {
  init(sentryOptions());
}
