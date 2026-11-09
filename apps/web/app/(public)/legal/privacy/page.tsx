import legal from '@repo/i18n/legal/es.json';
import type { Metadata } from 'next';

import { LegalDocument } from '@/components/legal-document';

export const metadata: Metadata = { title: legal.privacy.title };

export default function PrivacyPage() {
  return <LegalDocument document="privacy" />;
}
