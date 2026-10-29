'use client';

import { TriangleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PageMessage } from '@/components/page-message';
import { Button } from '@/components/ui/button';

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations('errorPage');

  return (
    <PageMessage icon={<TriangleAlertIcon />} title={t('title')} body={t('body')}>
      <Button onClick={retry}>{t('retry')}</Button>
    </PageMessage>
  );
}
