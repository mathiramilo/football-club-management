import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { PgBoss } from 'pg-boss';

import type { Env } from '../config/env.js';
import { JobAlerts, LoggerJobAlerts } from './job-alerts.js';
import { JobWorkers } from './job-workers.js';
import { Jobs } from './jobs.js';

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    {
      provide: PgBoss,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new PgBoss(config.get('DATABASE_URL', { infer: true })),
    },
    { provide: JobAlerts, useClass: LoggerJobAlerts },
    Jobs,
    JobWorkers,
  ],
  exports: [PgBoss, JobAlerts, Jobs],
})
export class JobsModule {}
