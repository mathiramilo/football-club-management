import { SearchXIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { PageMessage } from '@/components/page-message';
import { Button } from '@/components/ui/button';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('notFound');
  return { title: t('title') };
}

export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <PageMessage icon={<SearchXIcon />} title={t('title')} body={t('body')}>
      <Button asChild>
        <Link href="/">{t('action')}</Link>
      </Button>
    </PageMessage>
  );
}
