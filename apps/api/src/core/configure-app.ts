import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
    maxAge: PREFLIGHT_CACHE_SECONDS,
  });
}

export function configureApp(app: INestApplication): void {
  applyGlobalPrefix(app);
  // Express runs middleware in the order it is added, so CORS must come before Better Auth's routes.
  allowWebOrigins(app);
  mountAuthHandler(app);
}
