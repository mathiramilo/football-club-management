import { useAppConfigGet } from '@repo/api-client';
import { useSyncExternalStore } from 'react';

const appConfigStaleTimeMs = 60 * 60 * 1000;

export type Store = 'ios' | 'android';

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

export function useStoreLinks() {
  const { data } = useAppConfigGet({ query: { staleTime: appConfigStaleTimeMs } });
  const stores = useDeviceStores();
  const links = (stores ?? []).flatMap((store) => {
    const url = data?.storeUrls[store];
    return url ? [{ store, url }] : [];
  });
  return { links, updateRequired: data?.updateRequired === true };
}
