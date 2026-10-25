import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ClockModule } from '../clock/clock.js';
import { AppConfigController } from './app-config.controller.js';
import { AppConfigRepository } from './app-config.repository.js';
import { AppConfigService } from './app-config.service.js';
import { AppVersionGuard } from './app-version.guard.js';

@Module({
  imports: [ClockModule],
  controllers: [AppConfigController],
  providers: [
    AppConfigRepository,
    AppConfigService,
    { provide: APP_GUARD, useClass: AppVersionGuard },
  ],
})
export class AppConfigModule {}
