import { LinkIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { TabPage } from '@/components/tab-page';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav.tabs');
  return { title: t('home') };
}

export default async function HomePage() {
  const t = await getTranslations();

  return (
    <TabPage title={t('nav.tabs.home')}>
      <Empty>
        <EmptyMedia>
          <LinkIcon />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t('home.empty.title')}</EmptyTitle>
          <EmptyDescription>{t('home.empty.body')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </TabPage>
  );
}
