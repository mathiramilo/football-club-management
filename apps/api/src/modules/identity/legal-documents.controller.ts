import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type AcceptLegalDocumentsBody,
  acceptLegalDocumentsBody,
  type LegalDocumentsResponse,
  legalDocumentsResponse,
} from '@repo/contracts';
import { ClsService } from 'nestjs-cls';

import { type Actor, CurrentActor } from '../../core/auth/actor.js';
import { Can, Policies } from '../../core/authorization/policy.js';
import { ResponseSchema } from '../../core/contract/response-schema.decorator.js';
import type { RequestContext } from '../../core/request-context.js';
import { BeforeLegalAcceptance } from './before-legal-acceptance.decorator.js';
import { identityPolicies } from './identity.policy.js';
import { LegalAcceptancesService } from './legal-acceptances.service.js';

@ApiTags('identity')
@Policies(identityPolicies)
@BeforeLegalAcceptance()
@Controller('me')
export class LegalDocumentsController {
  constructor(
    private readonly legal: LegalAcceptancesService,
    private readonly cls: ClsService<RequestContext>,
  ) {}

  @Get('legal-documents')
  @Can('identity.legal.read')
  @ResponseSchema(legalDocumentsResponse)
  get(@CurrentActor() actor: Actor): Promise<LegalDocumentsResponse> {
    return this.legal.statusFor(actor.userId);
  }

  @Post('legal-acceptances')
  @HttpCode(HttpStatus.OK)
  @Can('identity.legal.accept')
  @ResponseSchema(legalDocumentsResponse)
  accept(
    @CurrentActor() actor: Actor,
    @Body({ schema: acceptLegalDocumentsBody }) body: AcceptLegalDocumentsBody,
  ): Promise<LegalDocumentsResponse> {
    return this.legal.accept(actor.userId, body.documents, this.cls.get('client')?.platform);
  }
}
