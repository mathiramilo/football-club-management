import {
  type AcceptLegalDocumentsBody,
  AcceptLegalDocumentsBodyDocumentsItemDocument,
  type LegalDocumentStatus,
  useLegalDocumentsGet,
} from '@repo/api-client';

export type LegalGate = 'accepted' | 'required' | 'checking';

const legalDocumentsQuery = { meta: { persist: true } };

export function useLegalDocuments() {
  return useLegalDocumentsGet({ query: legalDocumentsQuery });
}

export function useLegalGate(isSignedIn: boolean): LegalGate {
  const { data, isPending, fetchStatus } = useLegalDocumentsGet({
    query: { ...legalDocumentsQuery, enabled: isSignedIn },
  });
  if (data) return data.acceptanceRequired ? 'required' : 'accepted';
  if (isSignedIn && isPending && fetchStatus === 'fetching') return 'checking';
  return 'accepted';
}

const isKnownLegalDocument = (
  document: string,
): document is AcceptLegalDocumentsBodyDocumentsItemDocument =>
  Object.hasOwn(AcceptLegalDocumentsBodyDocumentsItemDocument, document);

export function pendingAcceptances(
  documents: LegalDocumentStatus[],
): AcceptLegalDocumentsBody['documents'] {
  return documents.flatMap(({ document, version, acceptanceRequired }) =>
    acceptanceRequired && isKnownLegalDocument(document) ? [{ document, version }] : [],
  );
}

const webUrl = process.env.EXPO_PUBLIC_WEB_URL;

export const legalDocumentUrl = (document: AcceptLegalDocumentsBodyDocumentsItemDocument) =>
  webUrl ? `${webUrl}/legal/${document}` : null;
