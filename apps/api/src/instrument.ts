import * as Sentry from '@sentry/nestjs';

import { sentryEnvSchema } from './core/config/env.js';
import { sentryOptions } from './core/observability/sentry-options.js';

Sentry.init(sentryOptions(sentryEnvSchema.parse(process.env)));
