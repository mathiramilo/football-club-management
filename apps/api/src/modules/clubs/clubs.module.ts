import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../../core/analytics/analytics.module.js';
import { ClockModule } from '../../core/clock/clock.js';
import { OutboxModule } from '../../core/outbox/outbox.js';
import { MediaModule } from '../media/media.module.js';
import { ClubCrestController } from './club-crest.controller.js';
import { ClubCrestService } from './club-crest.service.js';
import { ClubsController } from './clubs.controller.js';
import { ClubsRepository } from './clubs.repository.js';
import { ClubsService } from './clubs.service.js';
import { InviteJoinsRepository } from './invite-joins.repository.js';
import { InviteJoinsService } from './invite-joins.service.js';
import { InviteCategoryLoader, InviteLinkLoader } from './invite-link-scopes.js';
import { InviteLinksController } from './invite-links.controller.js';
import { InviteLinksRepository } from './invite-links.repository.js';
import { InviteLinksService } from './invite-links.service.js';
import { InviteTokens } from './invite-tokens.js';
import { InvitesController } from './invites.controller.js';
import { MyClubsController } from './my-clubs.controller.js';
import { PublicInvitesController } from './public-invites.controller.js';

@Module({
  imports: [AnalyticsModule, ClockModule, MediaModule, OutboxModule],
  controllers: [
    ClubsController,
    MyClubsController,
    ClubCrestController,
    InviteLinksController,
    InvitesController,
    PublicInvitesController,
  ],
  providers: [
    ClubCrestService,
    ClubsRepository,
    ClubsService,
    InviteCategoryLoader,
    InviteJoinsRepository,
    InviteJoinsService,
    InviteLinkLoader,
    InviteLinksRepository,
    InviteLinksService,
    InviteTokens,
  ],
})
export class ClubsModule {}
