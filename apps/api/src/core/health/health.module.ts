import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import { HealthController } from './health.controller.js';
import { ReadinessService, SHUTDOWN_DRAIN_MS } from './readiness.service.js';

@Module({
  controllers: [HealthController],
  providers: [
    ReadinessService,
    {
      provide: SHUTDOWN_DRAIN_MS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): number =>
        config.get('SHUTDOWN_DRAIN_MS', { infer: true }),
    },
  ],
})
export class HealthModule {}
