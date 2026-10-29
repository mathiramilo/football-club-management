'use client';

import { RefreshCwIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PageMessage } from '@/components/page-message';
import { Button } from '@/components/ui/button';

const reload = () => {
  window.location.reload();
};

export function UpdateRequired() {
  const t = useTranslations('updateRequired.web');

  return (
    <PageMessage icon={<RefreshCwIcon />} title={t('title')} body={t('body')}>
      <Button onClick={reload}>{t('action')}</Button>
    </PageMessage>
  );
}
