import type { INestApplication } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { Express } from 'express';

import { AUTH } from './auth.tokens.js';
import { AUTH_BASE_PATH, type Auth } from './create-auth.js';

// Better Auth reads the raw request body, so its route must exist before init() adds Nest's body parser.
export function mountAuthHandler(app: INestApplication): void {
  const express = app.getHttpAdapter().getInstance() as Express;
  express.all(`${AUTH_BASE_PATH}/*splat`, toNodeHandler(app.get<Auth>(AUTH)));
}
