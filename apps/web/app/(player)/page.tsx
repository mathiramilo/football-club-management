import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { HomeScreen } from '@/components/home-screen';
import { TabPage } from '@/components/tab-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav.tabs');
  return { title: t('home') };
}

export default async function HomePage() {
  const t = await getTranslations('nav.tabs');

  return (
    <TabPage title={t('home')}>
      <HomeScreen />
    </TabPage>
  );
}
