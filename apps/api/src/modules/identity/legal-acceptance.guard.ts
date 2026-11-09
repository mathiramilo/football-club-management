import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';

import { DomainError } from '../../core/errors/domain-error.js';
import type { RequestContext } from '../../core/request-context.js';
import { BeforeLegalAcceptance } from './before-legal-acceptance.decorator.js';
import { LegalAcceptancesService } from './legal-acceptances.service.js';

// BR-AUTH-08: until the documents in force are accepted, nothing else can be done.
@Injectable()
export class LegalAcceptanceGuard implements CanActivate {
  constructor(
    private readonly legal: LegalAcceptancesService,
    private readonly reflector: Reflector,
    private readonly cls: ClsService<RequestContext>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const actor = this.cls.get('actor');
    if (!actor) return true;
    const allowedBefore = this.reflector.getAllAndOverride<true | undefined>(
      BeforeLegalAcceptance.KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowedBefore) return true;

    const { acceptanceRequired } = await this.legal.statusFor(actor.userId);
    if (acceptanceRequired) throw new DomainError('LEGAL_ACCEPTANCE_REQUIRED');
    return true;
  }
}
