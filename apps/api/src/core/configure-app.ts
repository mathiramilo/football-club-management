import type { INestApplication } from '@nestjs/common';

import { mountAuthHandler } from './auth/mount-auth-handler.js';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('v1', { exclude: ['health', 'health/ready'] });
  mountAuthHandler(app);
}
