import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type CreateInviteLinkBody,
  createInviteLinkBody,
  type InviteLink,
  inviteLink,
  type InviteLinksResponse,
  inviteLinksResponse,
  type UpdateInviteLinkBody,
  updateInviteLinkBody,
} from '@repo/contracts';

import type { ClubActor } from '../../core/authorization/club-actor.js';
import { CurrentClubActor } from '../../core/authorization/current-club-actor.decorator.js';
import { Can, Policies } from '../../core/authorization/policy.js';
import { ResponseSchema } from '../../core/contract/response-schema.decorator.js';
import { clubsPolicies } from './clubs.policy.js';
import { InviteLinksService } from './invite-links.service.js';

@ApiTags('clubs')
@Policies(clubsPolicies)
@Controller('clubs/:clubId/categories/:categoryId/invite-links')
export class InviteLinksController {
  constructor(private readonly inviteLinks: InviteLinksService) {}

  @Get()
  @Can('clubs.invite-links.read')
  @ResponseSchema(inviteLinksResponse)
  list(
    @CurrentClubActor() actor: ClubActor,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<InviteLinksResponse> {
    return this.inviteLinks.list(actor, categoryId);
  }

  @Post()
  @Can('clubs.invite-links.create')
  @ResponseSchema(inviteLink, { status: HttpStatus.CREATED })
  create(
    @CurrentClubActor() actor: ClubActor,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body({ schema: createInviteLinkBody }) body: CreateInviteLinkBody,
  ): Promise<InviteLink> {
    return this.inviteLinks.create(actor, categoryId, body);
  }

  @Patch(':linkId')
  @Can('clubs.invite-links.update')
  @ResponseSchema(inviteLink)
  update(
    @CurrentClubActor() actor: ClubActor,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body({ schema: updateInviteLinkBody }) body: UpdateInviteLinkBody,
  ): Promise<InviteLink> {
    return this.inviteLinks.updateApproval(actor, categoryId, linkId, body.requiresApproval);
  }

  @Delete(':linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Can('clubs.invite-links.revoke')
  revoke(
    @CurrentClubActor() actor: ClubActor,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ): Promise<void> {
    return this.inviteLinks.revoke(actor, categoryId, linkId);
  }
}
