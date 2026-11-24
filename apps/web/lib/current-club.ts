import { type MyClub, useMyClubsList } from '@repo/api-client';

import { useRememberedClubId } from '@/lib/current-club-store';

export type CurrentClub =
  | { status: 'loading' }
  | { status: 'failed'; retry: () => void }
  | { status: 'none' }
  | { status: 'ready'; membership: MyClub; memberships: MyClub[] };

export function useCurrentClub(): CurrentClub {
  const { data, isError, refetch } = useMyClubsList();
  const rememberedId = useRememberedClubId();

  if (!data) {
    return isError
      ? {
          status: 'failed',
          retry: () => {
            void refetch();
          },
        }
      : { status: 'loading' };
  }
  const [first] = data.items;
  if (!first) return { status: 'none' };
  const membership = data.items.find(({ club }) => club.id === rememberedId) ?? first;
  return { status: 'ready', membership, memberships: data.items };
}
