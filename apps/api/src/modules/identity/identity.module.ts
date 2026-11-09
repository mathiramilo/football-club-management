import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ClockModule } from '../../core/clock/clock.js';
import { LegalAcceptanceGuard } from './legal-acceptance.guard.js';
import { LegalAcceptancesRepository } from './legal-acceptances.repository.js';
import { LegalAcceptancesService } from './legal-acceptances.service.js';
import { LEGAL_DOCUMENTS, LEGAL_DOCUMENTS_IN_FORCE } from './legal-documents.js';
import { LegalDocumentsController } from './legal-documents.controller.js';

@Module({
  imports: [ClockModule],
  controllers: [LegalDocumentsController],
  providers: [
    { provide: LEGAL_DOCUMENTS, useValue: LEGAL_DOCUMENTS_IN_FORCE },
    LegalAcceptancesRepository,
    LegalAcceptancesService,
    { provide: APP_GUARD, useClass: LegalAcceptanceGuard },
  ],
})
export class IdentityModule {}
