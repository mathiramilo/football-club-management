import { Injectable } from '@nestjs/common';
import { type LegalDocument, legalDocument, type Platform } from '@repo/contracts';

import { PrismaService } from '../../core/database/prisma.service.js';
import type { AcceptedVersions } from './legal-documents.js';

export interface AcceptedDocument {
  document: LegalDocument;
  version: string;
}

const isoDateOf = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class LegalAcceptancesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async latestAcceptedVersions(userId: string): Promise<AcceptedVersions> {
    const rows = await this.prisma.legalAcceptance.groupBy({
      by: ['document'],
      where: { userId },
      _max: { version: true },
    });
    return new Map(
      rows.flatMap(({ document, _max }) => {
        const known = legalDocument.safeParse(document);
        return known.success && _max.version ? [[known.data, isoDateOf(_max.version)]] : [];
      }),
    );
  }

  async record(
    userId: string,
    documents: readonly AcceptedDocument[],
    platform: Platform,
    acceptedAt: Date,
  ): Promise<void> {
    await this.prisma.legalAcceptance.createMany({
      data: documents.map(({ document, version }) => ({
        userId,
        document,
        version: new Date(version),
        platform,
        acceptedAt,
      })),
      skipDuplicates: true,
    });
  }
}
