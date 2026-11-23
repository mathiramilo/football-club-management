import type { MyClub } from '@repo/contracts';

import { isCurrentOn, localDate } from '../../core/authorization/club-actor.js';
import type { ClubMembershipOfUser } from './clubs.repository.js';

export function serializeMyClub(membership: ClubMembershipOfUser, now: Date): MyClub {
  const today = localDate(now, membership.club.timezone);
  return {
    club: membership.club,
    membershipId: membership.id,
    isOwner: membership.isOwner,
    isAdmin: membership.isAdmin || membership.isOwner,
    categories: membership.categoryMemberships
      .filter((categoryMembership) => isCurrentOn(categoryMembership, today))
      .map(({ categoryId, name, format, staffRole, isPlayer }) => ({
        categoryId,
        name,
        format,
        staffRole,
        isPlayer,
      })),
  };
}
