import { createMMKV } from 'react-native-mmkv';

import { getSessionToken, subscribeToSession } from '@/lib/session';

const storageKey = 'invite-token';
const storage = createMMKV({ id: 'held-invite' });

subscribeToSession(() => {
  if (getSessionToken() === null) storage.remove(storageKey);
});

export const holdInvite = (token: string) => {
  storage.set(storageKey, token);
};

export const takeHeldInvite = (): string | null => {
  const token = storage.getString(storageKey) ?? null;
  storage.remove(storageKey);
  return token;
};
