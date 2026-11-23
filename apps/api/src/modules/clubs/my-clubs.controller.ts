import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type MyClubsResponse, myClubsResponse } from '@repo/contracts';

import { type Actor, CurrentActor } from '../../core/auth/actor.js';
import { Can, Policies } from '../../core/authorization/policy.js';
import { ResponseSchema } from '../../core/contract/response-schema.decorator.js';
import { clubsPolicies } from './clubs.policy.js';
import { ClubsService } from './clubs.service.js';

@ApiTags('clubs')
@Policies(clubsPolicies)
@Controller('me/clubs')
export class MyClubsController {
  constructor(private readonly clubs: ClubsService) {}

  @Get()
  @Can('clubs.own-memberships.read')
  @ResponseSchema(myClubsResponse)
  list(@CurrentActor() actor: Actor): Promise<MyClubsResponse> {
    return this.clubs.listMine(actor.userId);
  }
}
