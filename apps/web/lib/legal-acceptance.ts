import {
  type AcceptLegalDocumentsBody,
  AcceptLegalDocumentsBodyDocumentsItemDocument,
  type LegalDocumentStatus,
} from '@repo/api-client';
import { useSyncExternalStore } from 'react';

let requiredAt: number | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function requireLegalAcceptance() {
  requiredAt = Date.now();
  for (const listener of listeners) listener();
}

export function useLegalAcceptanceRequiredAt() {
  return useSyncExternalStore(
    subscribe,
    () => requiredAt,
    () => null,
  );
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
