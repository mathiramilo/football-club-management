import { useSyncExternalStore } from 'react';

let updateRequiredAt: number | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function requireUpdate() {
  updateRequiredAt = Date.now();
  for (const listener of listeners) listener();
}

export function useUpdateRequiredAt() {
  return useSyncExternalStore(subscribe, () => updateRequiredAt);
}
