import type { INestApplication } from '@nestjs/common';

import { mountAuthHandler } from './auth/mount-auth-handler.js';

export function applyGlobalPrefix(app: INestApplication): void {
  app.setGlobalPrefix('v1', { exclude: ['health', 'health/ready'] });
}

export function configureApp(app: INestApplication): void {
  applyGlobalPrefix(app);
  mountAuthHandler(app);
}
