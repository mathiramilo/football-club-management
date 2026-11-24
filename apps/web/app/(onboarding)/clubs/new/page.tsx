import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CreateClub } from '@/components/create-club';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('createClub');
  return { title: t('title') };
}

export default function NewClubPage() {
  return <CreateClub />;
}
