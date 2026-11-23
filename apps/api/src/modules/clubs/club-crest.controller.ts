import { Body, Controller, Delete, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type ClubSummary,
  clubSummary,
  type ClubUploadResponse,
  clubUploadResponse,
  type CreateClubUploadBody,
  createClubUploadBody,
  type SetClubCrestBody,
  setClubCrestBody,
} from '@repo/contracts';

import type { ClubActor } from '../../core/authorization/club-actor.js';
import { CurrentClubActor } from '../../core/authorization/current-club-actor.decorator.js';
import { Can, Policies } from '../../core/authorization/policy.js';
import { ResponseSchema } from '../../core/contract/response-schema.decorator.js';
import { ClubCrestService } from './club-crest.service.js';
import { clubsPolicies } from './clubs.policy.js';

@ApiTags('clubs')
@Policies(clubsPolicies)
@Controller('clubs/:clubId')
export class ClubCrestController {
  constructor(private readonly crests: ClubCrestService) {}

  @Post('uploads')
  @Can('clubs.profile.update')
  @ResponseSchema(clubUploadResponse, { status: HttpStatus.CREATED })
  createUpload(
    @CurrentClubActor() actor: ClubActor,
    @Body({ schema: createClubUploadBody }) body: CreateClubUploadBody,
  ): Promise<ClubUploadResponse> {
    return this.crests.createUpload(actor.club, body);
  }

  @Put('crest')
  @Can('clubs.profile.update')
  @ResponseSchema(clubSummary)
  set(
    @CurrentClubActor() actor: ClubActor,
    @Body({ schema: setClubCrestBody }) body: SetClubCrestBody,
  ): Promise<ClubSummary> {
    return this.crests.set(actor.club, body.uploadKey);
  }

  @Delete('crest')
  @HttpCode(HttpStatus.OK)
  @Can('clubs.profile.update')
  @ResponseSchema(clubSummary)
  remove(@CurrentClubActor() actor: ClubActor): Promise<ClubSummary> {
    return this.crests.remove(actor.club);
  }
}
