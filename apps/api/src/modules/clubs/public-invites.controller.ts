import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type InvitePreview, invitePreview } from '@repo/contracts';

import { Public } from '../../core/auth/public.decorator.js';
import { ResponseSchema } from '../../core/contract/response-schema.decorator.js';
import { BeforeLegalAcceptance } from '../identity/before-legal-acceptance.decorator.js';
import { InviteLinksService } from './invite-links.service.js';

// BR-AUTH-09: the invite is shown before sign-in, so it carries no personal data.
@ApiTags('clubs')
@Public()
@BeforeLegalAcceptance()
@Controller('public/invites')
export class PublicInvitesController {
  constructor(private readonly inviteLinks: InviteLinksService) {}

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  @ResponseSchema(invitePreview)
  preview(@Param('token') token: string): Promise<InvitePreview> {
    return this.inviteLinks.preview(token);
  }
}
