import { useSyncExternalStore } from 'react';

const reloadedAtKey = 'update-required-reloaded-at';
const reloadCooldownMs = 60_000;

let isUpdateRequired = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const reloadUnlessJustReloaded = () => {
  try {
    const reloadedAt = Number(sessionStorage.getItem(reloadedAtKey));
    if (Date.now() - reloadedAt < reloadCooldownMs) return false;
    sessionStorage.setItem(reloadedAtKey, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
};

export function requireUpdate() {
  if (isUpdateRequired || reloadUnlessJustReloaded()) return;
  isUpdateRequired = true;
  for (const listener of listeners) listener();
}

export function useIsUpdateRequired() {
  return useSyncExternalStore(
    subscribe,
    () => isUpdateRequired,
    () => false,
  );
}
