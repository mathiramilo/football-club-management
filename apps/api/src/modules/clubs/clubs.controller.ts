import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type CreateClubBody, createClubBody, type MyClub, myClub } from '@repo/contracts';

import { type Actor, CurrentActor } from '../../core/auth/actor.js';
import { Can, Policies } from '../../core/authorization/policy.js';
import { ResponseSchema } from '../../core/contract/response-schema.decorator.js';
import { clubsPolicies } from './clubs.policy.js';
import { ClubsService } from './clubs.service.js';

@ApiTags('clubs')
@Policies(clubsPolicies)
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubs: ClubsService) {}

  @Post()
  @Can('clubs.club.create')
  @ResponseSchema(myClub, { status: HttpStatus.CREATED })
  create(
    @CurrentActor() actor: Actor,
    @Body({ schema: createClubBody }) body: CreateClubBody,
  ): Promise<MyClub> {
    return this.clubs.create(actor.userId, body);
  }
}
