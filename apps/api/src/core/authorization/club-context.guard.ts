import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import { z } from 'zod';

import { Clock } from '../clock/clock.js';
import type { RequestContext } from '../request-context.js';
import { toClubActor } from './club-actor.js';
import { ClubMembershipsRepository } from './club-memberships.repository.js';

const clubIdParam = z.uuid();

@Injectable()
export class ClubContextGuard implements CanActivate {
  constructor(
    private readonly memberships: ClubMembershipsRepository,
    private readonly clock: Clock,
    private readonly cls: ClsService<RequestContext>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { clubId } = context.switchToHttp().getRequest<Request>().params;
    const actor = this.cls.get('actor');
    if (clubId === undefined || !actor) return true;

    // A club the caller can't see answers 404, so its existence isn't revealed (API guidelines § 2).
    if (typeof clubId !== 'string' || !clubIdParam.safeParse(clubId).success)
      throw new NotFoundException();
    const membership = await this.memberships.findActive({ clubId }, actor.userId);
    if (!membership) throw new NotFoundException();

    this.cls.set('clubActor', toClubActor(membership, this.clock.now()));
    return true;
  }
}
