'use client';

import { SmartphoneIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Alert, AlertContent } from '@/components/ui/alert';
import { requireUpdate } from '@/lib/app-update';
import { useStoreLinks } from '@/lib/store-links';

export function DownloadAppBanner() {
  const t = useTranslations('downloadApp');
  const { links, updateRequired } = useStoreLinks();

  useEffect(() => {
    if (updateRequired) requireUpdate();
  }, [updateRequired]);

  if (links.length === 0) return null;

  return (
    <Alert role={undefined}>
      <SmartphoneIcon aria-hidden />
      <AlertContent>{t('banner')}</AlertContent>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {links.map(({ store, url }) => (
          <a
            key={store}
            href={url}
            className="font-bold text-club underline underline-offset-4 hover:text-club/80"
            rel="noreferrer"
          >
            {t('store', { store })}
          </a>
        ))}
      </div>
    </Alert>
  );
}
