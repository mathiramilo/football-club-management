import { type MyClub, useMyClubsList } from '@repo/api-client';
import { usesStaffNavigation } from '@repo/domain';
import { createMMKV, useMMKVString } from 'react-native-mmkv';

import { getSessionToken, subscribeToSession } from '@/lib/session';

const storageKey = 'current-club-id';
const storage = createMMKV({ id: 'preferences' });

const forgetWhenSignedOut = () => {
  if (getSessionToken() === null) storage.remove(storageKey);
};

forgetWhenSignedOut();
subscribeToSession(forgetWhenSignedOut);

export const rememberCurrentClub = (clubId: string) => {
  storage.set(storageKey, clubId);
};

export type CurrentClub =
  | { status: 'loading' }
  | { status: 'offline' }
  | { status: 'failed'; retry: () => void }
  | { status: 'none' }
  | { status: 'ready'; membership: MyClub; memberships: MyClub[]; isStaff: boolean };

const myClubsQuery = { meta: { persist: true } };

export function useCurrentClub(): CurrentClub {
  const { data, isError, fetchStatus, refetch } = useMyClubsList({ query: myClubsQuery });
  const [rememberedId] = useMMKVString(storageKey, storage);

  if (!data) {
    if (isError) {
      return {
        status: 'failed',
        retry: () => {
          void refetch();
        },
      };
    }
    return fetchStatus === 'paused' ? { status: 'offline' } : { status: 'loading' };
  }
  const [first] = data.items;
  if (!first) return { status: 'none' };
  const membership = data.items.find(({ club }) => club.id === rememberedId) ?? first;
  return {
    status: 'ready',
    membership,
    memberships: data.items,
    isStaff: usesStaffNavigation(membership),
  };
}
