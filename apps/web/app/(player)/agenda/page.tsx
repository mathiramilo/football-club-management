import { CalendarDaysIcon } from 'lucide-react';
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
  return { title: t('agenda') };
}

export default async function AgendaPage() {
  const t = await getTranslations();

  return (
    <TabPage title={t('nav.tabs.agenda')}>
      <Empty>
        <EmptyMedia>
          <CalendarDaysIcon />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t('agenda.empty.title')}</EmptyTitle>
          <EmptyDescription>{t('agenda.empty.body')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </TabPage>
  );
}
