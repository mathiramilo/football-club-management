import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

const tokenKey = 'session-token';
const keychainOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const readToken = () => {
  try {
    return SecureStore.getItem(tokenKey, keychainOptions);
  } catch {
    return null;
  }
};

let token = readToken();
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

export const getSessionToken = () => token;

export function subscribeToSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function startSession(newToken: string) {
  await SecureStore.setItemAsync(tokenKey, newToken, keychainOptions);
  token = newToken;
  notify();
}

export async function endSession() {
  if (token === null) return;
  token = null;
  notify();
  await SecureStore.deleteItemAsync(tokenKey, keychainOptions);
}

export function useIsSignedIn() {
  return useSyncExternalStore(subscribeToSession, () => token !== null);
}
