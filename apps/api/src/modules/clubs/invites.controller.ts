import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AcceptInviteResponse, acceptInviteResponse } from '@repo/contracts';

import { type Actor, CurrentActor } from '../../core/auth/actor.js';
import { Can, Policies } from '../../core/authorization/policy.js';
import { ResponseSchema } from '../../core/contract/response-schema.decorator.js';
import { clubsPolicies } from './clubs.policy.js';
import { InviteJoinsService } from './invite-joins.service.js';

@ApiTags('clubs')
@Policies(clubsPolicies)
@Controller('invites')
export class InvitesController {
  constructor(private readonly joins: InviteJoinsService) {}

  // TODO(AUTH-07): accept the 6-character code here too, with the invite rate limit (NFR-SEC-05).
  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @Can('clubs.invites.accept')
  @ResponseSchema(acceptInviteResponse)
  accept(
    @CurrentActor() actor: Actor,
    @Param('token') token: string,
  ): Promise<AcceptInviteResponse> {
    return this.joins.accept(actor.userId, token);
  }
}
