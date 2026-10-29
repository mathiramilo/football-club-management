import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SignOutButton } from '@/components/sign-out-button';
import { TabPage } from '@/components/tab-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav.tabs');
  return { title: t('profile') };
}

export default async function ProfilePage() {
  const t = await getTranslations();

  return (
    <TabPage title={t('nav.tabs.profile')}>
      <SignOutButton />
      <p className="text-center text-meta text-subtle-foreground">
        {t('profile.version', {
          app: t('app.name'),
          version: process.env.NEXT_PUBLIC_APP_VERSION ?? '',
        })}
      </p>
    </TabPage>
  );
}
