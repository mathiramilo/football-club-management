import type { ClubCrest, ClubSummary, MyClub } from '@repo/contracts';

import { isCurrentOn, localDate } from '../../core/authorization/club-actor.js';
import type { ClubMembershipOfUser, ClubRecord } from './clubs.repository.js';

export const serializeClub = (club: ClubRecord, crest: ClubCrest | null): ClubSummary => ({
  id: club.id,
  name: club.name,
  shortName: club.shortName,
  countryCode: club.countryCode,
  timezone: club.timezone,
  primaryColor: club.primaryColor,
  secondaryColor: club.secondaryColor,
  crest,
});

export function serializeMyClub(
  membership: ClubMembershipOfUser,
  crest: ClubCrest | null,
  now: Date,
): MyClub {
  const today = localDate(now, membership.club.timezone);
  return {
    club: serializeClub(membership.club, crest),
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
