import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST_ID_HEADER } from '@repo/contracts';
import { Logger } from 'nestjs-pino';

import { mountAuthHandler } from './auth/mount-auth-handler.js';
import type { Env } from './config/env.js';

const PREFLIGHT_CACHE_SECONDS = 600;

export function applyGlobalPrefix(app: INestApplication): void {
  app.setGlobalPrefix('v1', { exclude: ['health', 'health/ready'] });
}

function allowWebOrigins(app: INestApplication): void {
  app.enableCors({
    origin: app.get<ConfigService<Env, true>>(ConfigService).get('WEB_ORIGINS', { infer: true }),
    credentials: true,
    exposedHeaders: [REQUEST_ID_HEADER],
    maxAge: PREFLIGHT_CACHE_SECONDS,
  });
}

export function configureApp(app: INestApplication): void {
  app.useLogger(app.get(Logger));
  applyGlobalPrefix(app);
  // Express runs middleware in the order it is added, so CORS must come before Better Auth's routes.
  allowWebOrigins(app);
  mountAuthHandler(app);
}
