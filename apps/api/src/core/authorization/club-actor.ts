import { TZDate } from '@date-fns/tz';
import type { StaffRole } from '@repo/contracts';
import { format } from 'date-fns';

import type { ClubContext } from '../database/club-scope.js';

export interface ActorClub extends ClubContext {
  readonly timezone: string;
}

export interface CategoryRole {
  readonly categoryId: string;
  readonly staffRole: StaffRole | null;
  readonly isPlayer: boolean;
}

export interface CategoryMembershipRecord extends CategoryRole {
  readonly startsOn: string;
  readonly endsOn: string | null;
}

export interface ClubMembershipRecord {
  readonly id: string;
  readonly userId: string;
  readonly isOwner: boolean;
  readonly isAdmin: boolean;
  readonly club: ActorClub;
  readonly categoryMemberships: readonly CategoryMembershipRecord[];
}

export interface ClubActor {
  readonly userId: string;
  readonly clubMembershipId: string;
  readonly club: ActorClub;
  readonly isOwner: boolean;
  readonly isAdmin: boolean;
  readonly categories: readonly CategoryRole[];
  readonly now: Date;
  readonly today: string;
  isStaffOf(categoryId: string): boolean;
  isStaffOfAny(categoryIds: Iterable<string>): boolean;
  isDtOf(categoryId: string): boolean;
  isCoachOf(categoryId: string): boolean;
  isPlayerOf(categoryId: string): boolean;
}

export const localDate = (instant: Date, timezone: string): string =>
  format(new TZDate(instant, timezone), 'yyyy-MM-dd');

// BR-CLUB-06: starts_on and ends_on are inclusive calendar days in the club time zone.
export const isCurrentOn = (
  membership: Pick<CategoryMembershipRecord, 'startsOn' | 'endsOn'>,
  today: string,
): boolean =>
  membership.startsOn <= today && (membership.endsOn === null || today <= membership.endsOn);

export function toClubActor(membership: ClubMembershipRecord, now: Date): ClubActor {
  const today = localDate(now, membership.club.timezone);
  const categories = membership.categoryMemberships
    .filter((categoryMembership) => isCurrentOn(categoryMembership, today))
    .map(({ categoryId, staffRole, isPlayer }) => ({ categoryId, staffRole, isPlayer }));
  const roleIn = (categoryId: string) =>
    categories.find((category) => category.categoryId === categoryId);
  const isStaffOf = (categoryId: string) => roleIn(categoryId)?.staffRole != null;

  return {
    userId: membership.userId,
    clubMembershipId: membership.id,
    club: membership.club,
    isOwner: membership.isOwner,
    // Permission matrix § 4: Club Admin includes the Owner.
    isAdmin: membership.isAdmin || membership.isOwner,
    categories,
    now,
    today,
    isStaffOf,
    isStaffOfAny: (categoryIds) => [...categoryIds].some(isStaffOf),
    isDtOf: (categoryId) => roleIn(categoryId)?.staffRole === 'dt',
    isCoachOf: (categoryId) => roleIn(categoryId)?.staffRole === 'coach',
    isPlayerOf: (categoryId) => roleIn(categoryId)?.isPlayer === true,
  };
}
