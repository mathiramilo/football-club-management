import { describe, expect, it } from 'vitest';

import {
  type CategoryMembershipRecord,
  type ClubMembershipRecord,
  toClubActor,
} from './club-actor.js';

const PRIMERA = 'category-primera';
const RESERVA = 'category-reserva';
const NOW = new Date('2026-10-23T15:00:00Z');

function membership(overrides: Partial<ClubMembershipRecord> = {}): ClubMembershipRecord {
  return {
    id: 'membership-1',
    userId: 'user-1',
    isOwner: false,
    isAdmin: false,
    club: { clubId: 'club-1', timezone: 'America/Montevideo' },
    categoryMemberships: [],
    ...overrides,
  };
}

function inCategory(
  categoryId: string,
  overrides: Partial<CategoryMembershipRecord> = {},
): CategoryMembershipRecord {
  return {
    categoryId,
    staffRole: null,
    isPlayer: true,
    startsOn: '2026-03-01',
    endsOn: null,
    ...overrides,
  };
}

describe('toClubActor (BR-ROLE-07, BR-ROLE-10, BR-CLUB-06)', () => {
  it('counts the Owner as a Club Admin (permission matrix § 4)', () => {
    const actor = toClubActor(membership({ isOwner: true }), NOW);

    expect(actor).toMatchObject({ isOwner: true, isAdmin: true });
  });

  it('gives a Club Admin no staff role by itself (BR-ROLE-10)', () => {
    const actor = toClubActor(membership({ isAdmin: true }), NOW);

    expect(actor.isAdmin).toBe(true);
    expect(actor.isStaffOf(PRIMERA)).toBe(false);
    expect(actor.isStaffOfAny([PRIMERA, RESERVA])).toBe(false);
  });

  it('answers each role per category', () => {
    const actor = toClubActor(
      membership({
        categoryMemberships: [
          inCategory(PRIMERA, { staffRole: 'dt', isPlayer: false }),
          inCategory(RESERVA),
        ],
      }),
      NOW,
    );

    expect(actor.isDtOf(PRIMERA)).toBe(true);
    expect(actor.isCoachOf(PRIMERA)).toBe(false);
    expect(actor.isPlayerOf(PRIMERA)).toBe(false);
    expect(actor.isStaffOf(RESERVA)).toBe(false);
    expect(actor.isPlayerOf(RESERVA)).toBe(true);
    expect(actor.isStaffOfAny([RESERVA, PRIMERA])).toBe(true);
    expect(actor.isStaffOfAny([RESERVA])).toBe(false);
  });

  it('lets a player-coach be staff and player of the same category (roles § 2)', () => {
    const actor = toClubActor(
      membership({ categoryMemberships: [inCategory(PRIMERA, { staffRole: 'coach' })] }),
      NOW,
    );

    expect(actor.isCoachOf(PRIMERA)).toBe(true);
    expect(actor.isPlayerOf(PRIMERA)).toBe(true);
  });

  it.each([
    ['ended yesterday', false, { endsOn: '2026-10-22' }],
    ['ends today', true, { endsOn: '2026-10-23' }],
    ['starts today', true, { startsOn: '2026-10-23' }],
    ['starts tomorrow', false, { startsOn: '2026-10-24' }],
    ['ended the day before it started', false, { startsOn: '2026-10-23', endsOn: '2026-10-22' }],
  ])('treats a membership that %s as current: %s', (_label, current, dates) => {
    const actor = toClubActor(
      membership({ categoryMemberships: [inCategory(PRIMERA, dates)] }),
      NOW,
    );

    expect(actor.isPlayerOf(PRIMERA)).toBe(current);
  });

  it.each([
    ['23:59 on the 23rd in Montevideo', '2026-10-24T02:59:59Z', '2026-10-23', true],
    ['00:00 on the 24th in Montevideo', '2026-10-24T03:00:00Z', '2026-10-24', false],
  ])('counts days in the club time zone at %s', (_label, instant, today, current) => {
    const actor = toClubActor(
      membership({ categoryMemberships: [inCategory(PRIMERA, { endsOn: '2026-10-23' })] }),
      new Date(instant),
    );

    expect(actor.today).toBe(today);
    expect(actor.isPlayerOf(PRIMERA)).toBe(current);
  });
});
