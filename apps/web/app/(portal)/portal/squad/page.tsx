import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { SquadPage } from '@/components/squad-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.nav');
  return { title: t('squad') };
}

export default function PortalSquadPage() {
  return (
    <Suspense>
      <SquadPage />
    </Suspense>
  );
}
