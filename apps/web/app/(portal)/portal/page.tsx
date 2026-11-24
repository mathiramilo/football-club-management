import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { StaffHome } from '@/components/staff-home';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.nav');
  return { title: t('home') };
}

export default function PortalHomePage() {
  return <StaffHome />;
}
