import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { Request } from 'express';
import { ClsModule, type ClsService } from 'nestjs-cls';

import { AuthModule } from './core/auth/auth.module.js';
import { clientInfoFrom } from './core/client/client-info.js';
import { envSchema } from './core/config/env.js';
import { ContractModule } from './core/contract/contract.module.js';
import { DatabaseModule } from './core/database/database.module.js';
import { ErrorsModule } from './core/errors/errors.module.js';
import { HealthModule } from './core/health/health.module.js';
import type { RequestContext } from './core/request-context.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: (env) => envSchema.parse(env) }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls: ClsService<RequestContext>, request: Request) => {
          cls.set('client', clientInfoFrom(request.headers));
        },
      },
    }),
    DatabaseModule,
    ErrorsModule,
    ContractModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
