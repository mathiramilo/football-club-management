import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { ClubHeader } from '@/components/club-header';
import { EmailCodeForm } from '@/components/email-code-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('emailCode');
  return { title: t('title'), robots: { index: false } };
}

export default async function EmailCodePage() {
  const t = await getTranslations('emailCode');

  return (
    <>
      <ClubHeader
        title={t('title')}
        subtitle={t('subtitle')}
        size="screen"
        back={{ label: t('back'), href: '/sign-in', keepSearch: true }}
      />
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-6">
        <Suspense>
          <EmailCodeForm />
        </Suspense>
      </main>
    </>
  );
}
