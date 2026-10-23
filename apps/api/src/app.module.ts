import { Module } from '@nestjs/common';

import { HealthModule } from './core/health/health.module.js';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
