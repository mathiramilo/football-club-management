import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../../core/analytics/analytics.module.js';
import { ClockModule } from '../../core/clock/clock.js';
import { MediaModule } from '../media/media.module.js';
import { ClubCrestController } from './club-crest.controller.js';
import { ClubCrestService } from './club-crest.service.js';
import { ClubsController } from './clubs.controller.js';
import { ClubsRepository } from './clubs.repository.js';
import { ClubsService } from './clubs.service.js';
import { MyClubsController } from './my-clubs.controller.js';

@Module({
  imports: [AnalyticsModule, ClockModule, MediaModule],
  controllers: [ClubsController, MyClubsController, ClubCrestController],
  providers: [ClubCrestService, ClubsRepository, ClubsService],
})
export class ClubsModule {}
