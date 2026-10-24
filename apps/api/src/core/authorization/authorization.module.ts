import { Module } from '@nestjs/common';
import { APP_GUARD, DiscoveryModule } from '@nestjs/core';

import { ClockModule } from '../clock/clock.js';
import { ClubContextGuard } from './club-context.guard.js';
import { ClubMembershipsRepository } from './club-memberships.repository.js';
import { PolicyGuard } from './policy.guard.js';
import { RouteDeclarationsCheck } from './route-declarations.check.js';

@Module({
  imports: [ClockModule, DiscoveryModule],
  providers: [
    ClubMembershipsRepository,
    RouteDeclarationsCheck,
    { provide: APP_GUARD, useClass: ClubContextGuard },
    { provide: APP_GUARD, useClass: PolicyGuard },
  ],
})
export class AuthorizationModule {}
