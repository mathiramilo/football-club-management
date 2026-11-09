'use client';

import {
  getLegalDocumentsGetQueryKey,
  type LegalDocumentStatus,
  useLegalDocumentsAccept,
} from '@repo/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRightIcon, FileTextIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ClubHeader } from '@/components/club-header';
import { Alert, AlertContent } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { signOut } from '@/lib/auth-client';
import { pendingAcceptances } from '@/lib/legal-acceptance';
import { errorMessageKey } from '@/lib/messages';

const documentLinks = [
  { document: 'terms', href: '/legal/terms' },
  { document: 'privacy', href: '/legal/privacy' },
] as const;

export function LegalAcceptance({ documents }: { documents: LegalDocumentStatus[] }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const queryKey = getLegalDocumentsGetQueryKey();
  const accept = useLegalDocumentsAccept({
    mutation: {
      onSuccess: (status) => {
        queryClient.setQueryData(queryKey, status);
      },
      onError: (error) => {
        if (error.code === 'LEGAL_DOCUMENT_OUTDATED')
          void queryClient.invalidateQueries({ queryKey });
      },
    },
  });

  const pending = pendingAcceptances(documents);
  const isUpdate = documents.every(
    ({ acceptanceRequired, acceptedVersion }) => !acceptanceRequired || acceptedVersion !== null,
  );
  const [first, second] = pending;
  const changed = first && !second ? first.document : 'both';

  return (
    <>
      <ClubHeader
        title={t(isUpdate ? 'legalAcceptance.updatedTitle' : 'legalAcceptance.title')}
        size="screen"
      />
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-6">
        <p className="text-body text-pretty">
          {isUpdate ? t('legalAcceptance.updatedBody', { changed }) : t('legalAcceptance.body')}
        </p>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
          {documentLinks.map(({ document, href }) => (
            <li key={document}>
              <Link
                href={href}
                className="flex min-h-14 items-center gap-3 px-4 py-3 text-body font-bold transition-colors outline-none hover:bg-muted focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring [&_svg]:size-5 [&_svg]:shrink-0"
              >
                <FileTextIcon aria-hidden className="text-club" />
                <span className="flex-1">{t(`legalAcceptance.documents.${document}`)}</span>
                <ChevronRightIcon aria-hidden className="text-subtle-foreground" />
              </Link>
            </li>
          ))}
        </ul>
        {accept.error && (
          <Alert variant="danger" role="alert">
            <AlertContent>{t(errorMessageKey(accept.error.code))}</AlertContent>
          </Alert>
        )}
        <div className="flex flex-col gap-2">
          <Button
            disabled={accept.isPending || pending.length === 0}
            onClick={() => {
              accept.mutate({ data: { documents: pending } });
            }}
          >
            {accept.isPending && <Spinner />}
            {t('legalAcceptance.accept')}
          </Button>
          <Button
            variant="link"
            onClick={() => {
              void signOut();
            }}
          >
            {t('legalAcceptance.signOut')}
          </Button>
        </div>
      </main>
    </>
  );
}
