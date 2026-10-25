import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  defaultShouldDehydrateQuery,
  focusManager,
  onlineManager,
  QueryClient,
} from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';
import * as Application from 'expo-application';
import * as Network from 'expo-network';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { persist?: boolean };
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_AGE_MS = 14 * DAY_MS;

export const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: CACHE_MAX_AGE_MS } },
});

const storage = createMMKV({ id: 'query-cache' });

const queryPersister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => storage.getString(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
    removeItem: (key) => {
      storage.remove(key);
    },
  },
});

export const persistOptions: PersistQueryClientProviderProps['persistOptions'] = {
  persister: queryPersister,
  maxAge: CACHE_MAX_AGE_MS,
  buster: Application.nativeApplicationVersion ?? '',
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.meta?.persist === true && defaultShouldDehydrateQuery(query),
  },
};

export async function clearQueryCache() {
  queryClient.clear();
  await queryPersister.removeClient();
}

const isOnline = (state: Network.NetworkState) =>
  state.isInternetReachable ?? state.isConnected ?? true;

onlineManager.setEventListener((setOnline) => {
  void Network.getNetworkStateAsync().then((state) => {
    setOnline(isOnline(state));
  });
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(isOnline(state));
  });
  return () => {
    subscription.remove();
  };
});

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (status) => {
    setFocused(status === 'active');
  });
  return () => {
    subscription.remove();
  };
});

const subscribeToOnline = (onChange: () => void) => onlineManager.subscribe(onChange);

export function useIsOnline() {
  return useSyncExternalStore(subscribeToOnline, () => onlineManager.isOnline());
}
