import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ClubHeader } from '@/components/club-header';
import { SignInForm } from '@/components/sign-in-form';
import { SocialSignIn } from '@/components/social-sign-in';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('signIn');
  return { title: t('title'), robots: { index: false } };
}

export default async function SignInPage() {
  const t = await getTranslations('signIn');

  return (
    <>
      <ClubHeader title={t('title')} size="screen" />
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-6">
        <SignInForm />
        <SocialSignIn />
      </main>
    </>
  );
}
