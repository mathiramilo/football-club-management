import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { type ConstructorOptions, PgBoss } from 'pg-boss';

import type { Env } from '../config/env.js';
import { JobAlerts, LoggerJobAlerts } from './job-alerts.js';
import { JobMonitor } from './job-monitor.js';
import { JobWorkers } from './job-workers.js';
import { Jobs } from './jobs.js';

// Without stored queue stats pg-boss never computes readyOldestSeconds, which the lag alert reads.
export const PG_BOSS_OPTIONS = { persistQueueStats: true } satisfies ConstructorOptions;

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    {
      provide: PgBoss,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new PgBoss({
          ...PG_BOSS_OPTIONS,
          connectionString: config.get('DATABASE_URL', { infer: true }),
        }),
    },
    { provide: JobAlerts, useClass: LoggerJobAlerts },
    Jobs,
    JobWorkers,
    JobMonitor,
  ],
  exports: [PgBoss, JobAlerts, Jobs],
})
export class JobsModule {}
