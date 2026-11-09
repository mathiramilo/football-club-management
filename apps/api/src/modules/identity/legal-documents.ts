import { type LegalDocument, legalDocument, type LegalDocumentsResponse } from '@repo/contracts';

export interface LegalDocumentVersions {
  version: string;
  minimumVersion: string;
}

export type LegalDocumentsInForce = Readonly<Record<LegalDocument, LegalDocumentVersions>>;

export type AcceptedVersions = ReadonlyMap<LegalDocument, string>;

export const LEGAL_DOCUMENTS = Symbol('LEGAL_DOCUMENTS');

// BR-AUTH-08: a new text raises `version`; only a material change also raises `minimumVersion`,
// which makes everyone accept again. Each version is the date its page on the web shows.
export const LEGAL_DOCUMENTS_IN_FORCE: LegalDocumentsInForce = {
  terms: { version: '2026-11-09', minimumVersion: '2026-11-09' },
  privacy: { version: '2026-11-09', minimumVersion: '2026-11-09' },
};

export function legalDocumentsStatus(
  inForce: LegalDocumentsInForce,
  accepted: AcceptedVersions,
): LegalDocumentsResponse {
  const documents = legalDocument.options.map((document) => {
    const { version, minimumVersion } = inForce[document];
    const acceptedVersion = accepted.get(document) ?? null;
    return {
      document,
      version,
      acceptedVersion,
      acceptanceRequired: acceptedVersion === null || acceptedVersion < minimumVersion,
    };
  });
  return {
    acceptanceRequired: documents.some(({ acceptanceRequired }) => acceptanceRequired),
    documents,
  };
}
