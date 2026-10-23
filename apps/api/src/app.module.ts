import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';

import { AuthModule } from './core/auth/auth.module.js';
import { envSchema } from './core/config/env.js';
import { DatabaseModule } from './core/database/database.module.js';
import { HealthModule } from './core/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: (env) => envSchema.parse(env) }),
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    DatabaseModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
