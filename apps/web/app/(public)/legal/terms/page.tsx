import legal from '@repo/i18n/legal/es.json';
import type { Metadata } from 'next';

import { LegalDocument } from '@/components/legal-document';

export const metadata: Metadata = { title: legal.terms.title };

export default function TermsPage() {
  return <LegalDocument document="terms" />;
}
