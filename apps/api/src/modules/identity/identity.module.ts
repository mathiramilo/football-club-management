import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AnalyticsModule } from '../../core/analytics/analytics.module.js';
import { ClockModule } from '../../core/clock/clock.js';
import { LegalAcceptanceGuard } from './legal-acceptance.guard.js';
import { LegalAcceptancesRepository } from './legal-acceptances.repository.js';
import { LegalAcceptancesService } from './legal-acceptances.service.js';
import { LEGAL_DOCUMENTS, LEGAL_DOCUMENTS_IN_FORCE } from './legal-documents.js';
import { LegalDocumentsController } from './legal-documents.controller.js';
import { ProfileController } from './profile.controller.js';
import { ProfileRepository } from './profile.repository.js';
import { ProfileService } from './profile.service.js';

@Module({
  imports: [AnalyticsModule, ClockModule],
  controllers: [LegalDocumentsController, ProfileController],
  providers: [
    { provide: LEGAL_DOCUMENTS, useValue: LEGAL_DOCUMENTS_IN_FORCE },
    LegalAcceptancesRepository,
    LegalAcceptancesService,
    ProfileRepository,
    ProfileService,
    { provide: APP_GUARD, useClass: LegalAcceptanceGuard },
  ],
})
export class IdentityModule {}
