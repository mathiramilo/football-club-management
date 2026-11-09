import { Inject, Injectable } from '@nestjs/common';
import type { LegalDocumentsResponse, Platform } from '@repo/contracts';

import { Clock } from '../../core/clock/clock.js';
import { DomainError } from '../../core/errors/domain-error.js';
import {
  type AcceptedDocument,
  LegalAcceptancesRepository,
} from './legal-acceptances.repository.js';
import {
  LEGAL_DOCUMENTS,
  type LegalDocumentsInForce,
  legalDocumentsStatus,
} from './legal-documents.js';

@Injectable()
export class LegalAcceptancesService {
  constructor(
    @Inject(LEGAL_DOCUMENTS) private readonly inForce: LegalDocumentsInForce,
    private readonly repository: LegalAcceptancesRepository,
    private readonly clock: Clock,
  ) {}

  async statusFor(userId: string): Promise<LegalDocumentsResponse> {
    return legalDocumentsStatus(this.inForce, await this.repository.latestAcceptedVersions(userId));
  }

  async accept(
    userId: string,
    documents: readonly AcceptedDocument[],
    platform: Platform | undefined,
  ): Promise<LegalDocumentsResponse> {
    if (!platform) throw new DomainError('BAD_REQUEST', 'Send X-Platform: ios, android or web');
    if (documents.some(({ document, version }) => version !== this.inForce[document].version)) {
      throw new DomainError('LEGAL_DOCUMENT_OUTDATED');
    }
    await this.repository.record(userId, documents, platform, this.clock.now());
    return this.statusFor(userId);
  }
}
