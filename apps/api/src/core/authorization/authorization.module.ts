import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ClockModule } from '../clock/clock.js';
import { ClubContextGuard } from './club-context.guard.js';
import { ClubMembershipsRepository } from './club-memberships.repository.js';

@Module({
  imports: [ClockModule],
  providers: [ClubMembershipsRepository, { provide: APP_GUARD, useClass: ClubContextGuard }],
})
export class AuthorizationModule {}
