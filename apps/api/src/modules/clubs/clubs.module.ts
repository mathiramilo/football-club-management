import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../../core/analytics/analytics.module.js';
import { ClockModule } from '../../core/clock/clock.js';
import { ClubsController } from './clubs.controller.js';
import { ClubsRepository } from './clubs.repository.js';
import { ClubsService } from './clubs.service.js';
import { MyClubsController } from './my-clubs.controller.js';

@Module({
  imports: [AnalyticsModule, ClockModule],
  controllers: [ClubsController, MyClubsController],
  providers: [ClubsRepository, ClubsService],
})
export class ClubsModule {}
