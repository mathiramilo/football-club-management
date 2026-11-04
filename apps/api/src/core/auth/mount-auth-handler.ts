import type { INestApplication } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { Express } from 'express';
import { ClsMiddleware } from 'nestjs-cls';
import { PinoLogger } from 'nestjs-pino';
import { pinoHttp } from 'pino-http';

import { requestLoggingOptions } from '../logging/log-options.js';
import { requestContextOptions } from '../request-context.js';
import { AUTH } from './auth.tokens.js';
import { AUTH_BASE_PATH, type Auth } from './create-auth.js';

// Better Auth reads the raw request body, so its route must exist before init() adds Nest's body parser.
// That also puts it ahead of Nest's middleware, so it sets up its own request context and request log.
export function mountAuthHandler(app: INestApplication): void {
  const express = app.getHttpAdapter().getInstance() as Express;
  express.all(
    `${AUTH_BASE_PATH}/*splat`,
    new ClsMiddleware(requestContextOptions).use,
    pinoHttp({ logger: PinoLogger.root, ...requestLoggingOptions() }),
    toNodeHandler(app.get<Auth>(AUTH)),
  );
}
