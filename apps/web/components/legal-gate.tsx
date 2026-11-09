'use client';

import { useLegalDocumentsGet } from '@repo/api-client';
import { useEffect } from 'react';

import { LegalAcceptance } from '@/components/legal-acceptance';
import { useLegalAcceptanceRequiredAt } from '@/lib/legal-acceptance';

export function LegalGate({ children }: { children: React.ReactNode }) {
  const { data, refetch } = useLegalDocumentsGet();
  const requiredAt = useLegalAcceptanceRequiredAt();

  useEffect(() => {
    if (requiredAt !== null) void refetch();
  }, [requiredAt, refetch]);

  if (data?.acceptanceRequired) return <LegalAcceptance documents={data.documents} />;
  return children;
}
