import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';

import { AppConfigModule } from './core/app-config/app-config.module.js';
import { AuthModule } from './core/auth/auth.module.js';
import { AuthorizationModule } from './core/authorization/authorization.module.js';
import { envSchema } from './core/config/env.js';
import { ContractModule } from './core/contract/contract.module.js';
import { DatabaseModule } from './core/database/database.module.js';
import { ErrorsModule } from './core/errors/errors.module.js';
import { HealthModule } from './core/health/health.module.js';
import { IdempotencyModule } from './core/idempotency/idempotency.module.js';
import { LoggingModule } from './core/logging/logging.module.js';
import { requestContextOptions } from './core/request-context.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: (env) => envSchema.parse(env) }),
    ClsModule.forRoot({ global: true, middleware: { mount: true, ...requestContextOptions } }),
    LoggingModule,
    DatabaseModule,
    ErrorsModule,
    // Its interceptor must wrap ContractModule's serializer, so it stores the response as sent.
    IdempotencyModule,
    ContractModule,
    // Before AuthModule, so an outdated app is told to update rather than to sign in again.
    AppConfigModule,
    AuthModule,
    // After AuthModule: global guards run in registration order, and this one needs the actor.
    AuthorizationModule,
    HealthModule,
  ],
})
export class AppModule {}
