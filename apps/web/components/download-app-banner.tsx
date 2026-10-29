'use client';

import { useAppConfigGet } from '@repo/api-client';
import { SmartphoneIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useSyncExternalStore } from 'react';

import { Alert, AlertContent } from '@/components/ui/alert';
import { requireUpdate } from '@/lib/app-update';

const appConfigStaleTimeMs = 60 * 60 * 1000;

type Store = 'ios' | 'android';

const storesForDevice = (): Store[] => {
  const userAgent = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(userAgent)) return ['ios'];
  if (/Android/i.test(userAgent)) return ['android'];
  return ['ios', 'android'];
};

let deviceStores: Store[] | undefined;

const subscribe = () => () => undefined;

const useDeviceStores = () =>
  useSyncExternalStore(
    subscribe,
    () => (deviceStores ??= storesForDevice()),
    () => null,
  );

export function DownloadAppBanner() {
  const t = useTranslations('downloadApp');
  const { data } = useAppConfigGet({ query: { staleTime: appConfigStaleTimeMs } });
  const stores = useDeviceStores();
  const updateRequired = data?.updateRequired === true;

  useEffect(() => {
    if (updateRequired) requireUpdate();
  }, [updateRequired]);

  const links = (stores ?? []).flatMap((store) => {
    const url = data?.storeUrls[store];
    return url ? [{ store, url }] : [];
  });
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
