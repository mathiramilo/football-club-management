import { captureRequestError, init } from '@sentry/nextjs';

import { sentryOptions } from './lib/sentry-options';

export function register() {
  init(sentryOptions());
}

export const onRequestError = captureRequestError;
