import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { JoinInvite } from '@/components/join-invite';
import { Skeleton } from '@/components/ui/skeleton';

interface JoinProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('joinInvite');
  return { title: t('metaTitle'), robots: { index: false } };
}

export default function JoinPage({ params }: JoinProps) {
  return (
    <Suspense fallback={<Skeleton className="mx-5 mt-10 h-48" />}>
      <Join params={params} />
    </Suspense>
  );
}

async function Join({ params }: JoinProps) {
  const { token } = await params;
  return <JoinInvite token={token} />;
}
