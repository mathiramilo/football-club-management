import { z } from 'zod';

import { extensibleEnum } from '../extensible-enum.js';

const legalDocuments = ['terms', 'privacy'] as const;

export const legalDocument = z.enum(legalDocuments);

const legalVersion = z.iso.date().describe('The date the text came into force (YYYY-MM-DD)');

export const legalDocumentStatus = z
  .object({
    document: extensibleEnum(legalDocuments),
    version: legalVersion.describe('The version in force: the one to accept'),
    acceptedVersion: legalVersion
      .nullable()
      .describe('The latest version this user accepted; null when none'),
    acceptanceRequired: z
      .boolean()
      .describe('Whether this user must accept the version in force (BR-AUTH-08)'),
  })
  .meta({ id: 'LegalDocumentStatus' });

export const legalDocumentsResponse = z
  .object({
    acceptanceRequired: z
      .boolean()
      .describe('Whether any document must be accepted before anything else can be done'),
    documents: z.array(legalDocumentStatus),
  })
  .meta({ id: 'LegalDocumentsResponse' });

export const acceptLegalDocumentsBody = z
  .object({
    documents: z
      .array(z.object({ document: legalDocument, version: legalVersion }))
      .min(1)
      .max(legalDocuments.length)
      .refine(
        (documents) => new Set(documents.map(({ document }) => document)).size === documents.length,
        { message: 'DUPLICATE_DOCUMENT' },
      ),
  })
  .meta({ id: 'AcceptLegalDocumentsBody' });

export type LegalDocument = z.infer<typeof legalDocument>;
export type LegalDocumentStatus = z.infer<typeof legalDocumentStatus>;
export type LegalDocumentsResponse = z.infer<typeof legalDocumentsResponse>;
export type AcceptLegalDocumentsBody = z.infer<typeof acceptLegalDocumentsBody>;
