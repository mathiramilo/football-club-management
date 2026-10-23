import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { ClockModule } from '../clock/clock.js';
import { IdempotencyInterceptor } from './idempotency.interceptor.js';
import { IdempotencyKeysRepository } from './idempotency-keys.repository.js';

@Module({
  imports: [ClockModule],
  providers: [
    IdempotencyKeysRepository,
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class IdempotencyModule {}
