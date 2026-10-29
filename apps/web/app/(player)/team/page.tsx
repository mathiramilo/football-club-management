import { UsersIcon } from 'lucide-react';
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
  return { title: t('team') };
}

export default async function TeamPage() {
  const t = await getTranslations();

  return (
    <TabPage title={t('nav.tabs.team')}>
      <Empty>
        <EmptyMedia>
          <UsersIcon />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t('team.empty.title')}</EmptyTitle>
          <EmptyDescription>{t('team.empty.body')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </TabPage>
  );
}
