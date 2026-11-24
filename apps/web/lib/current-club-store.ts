import { useSyncExternalStore } from 'react';

const storageKey = 'current-club-id';
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

const readRemembered = () => {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
};

const writeRemembered = (clubId: string | null) => {
  try {
    if (clubId) localStorage.setItem(storageKey, clubId);
    else localStorage.removeItem(storageKey);
  } catch {
    return;
  }
  for (const listener of listeners) listener();
};

export const useRememberedClubId = () =>
  useSyncExternalStore(subscribe, readRemembered, () => null);

export const rememberCurrentClub = (clubId: string) => {
  writeRemembered(clubId);
};

export const forgetCurrentClub = () => {
  writeRemembered(null);
};
