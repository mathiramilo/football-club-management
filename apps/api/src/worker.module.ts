import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';

import { envSchema } from './core/config/env.js';
import { DatabaseModule } from './core/database/database.module.js';
import { JobsModule } from './core/jobs/jobs.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: (env) => envSchema.parse(env) }),
    ClsModule.forRoot({ global: true }),
    DatabaseModule,
    JobsModule,
  ],
})
export class WorkerModule {}
