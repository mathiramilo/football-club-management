import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AnalyticsModule } from '../../core/analytics/analytics.module.js';
import { ClockModule } from '../../core/clock/clock.js';
import { MediaModule } from '../media/media.module.js';
import { LegalAcceptanceGuard } from './legal-acceptance.guard.js';
import { LegalAcceptancesRepository } from './legal-acceptances.repository.js';
import { LegalAcceptancesService } from './legal-acceptances.service.js';
import { LEGAL_DOCUMENTS, LEGAL_DOCUMENTS_IN_FORCE } from './legal-documents.js';
import { LegalDocumentsController } from './legal-documents.controller.js';
import { ProfileController } from './profile.controller.js';
import { ProfileRepository } from './profile.repository.js';
import { ProfileService } from './profile.service.js';
import { ProfilePhotoController } from './profile-photo.controller.js';
import { ProfilePhotoService } from './profile-photo.service.js';

@Module({
  imports: [AnalyticsModule, ClockModule, MediaModule],
  controllers: [LegalDocumentsController, ProfileController, ProfilePhotoController],
  providers: [
    { provide: LEGAL_DOCUMENTS, useValue: LEGAL_DOCUMENTS_IN_FORCE },
    LegalAcceptancesRepository,
    LegalAcceptancesService,
    ProfileRepository,
    ProfilePhotoService,
    ProfileService,
    { provide: APP_GUARD, useClass: LegalAcceptanceGuard },
  ],
})
export class IdentityModule {}
