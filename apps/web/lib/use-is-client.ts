import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

export const useIsClient = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
