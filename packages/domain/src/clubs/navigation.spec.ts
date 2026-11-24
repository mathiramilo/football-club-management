import { describe, expect, it } from 'vitest';

import { usesStaffNavigation } from './navigation.js';

describe('usesStaffNavigation (UX § 3.2–3.3)', () => {
  it('gives Club Admins the staff navigation, with or without categories', () => {
    expect(usesStaffNavigation({ isAdmin: true, categories: [] })).toBe(true);
    expect(usesStaffNavigation({ isAdmin: true, categories: [{ staffRole: null }] })).toBe(true);
  });

  it('gives DTs and Coaches the staff navigation', () => {
    expect(usesStaffNavigation({ isAdmin: false, categories: [{ staffRole: 'dt' }] })).toBe(true);
    expect(
      usesStaffNavigation({
        isAdmin: false,
        categories: [{ staffRole: null }, { staffRole: 'coach' }],
      }),
    ).toBe(true);
  });

  it('counts a staff role it does not know yet as staff', () => {
    expect(usesStaffNavigation({ isAdmin: false, categories: [{ staffRole: 'physio' }] })).toBe(
      true,
    );
  });

  it('gives players and members without categories the player navigation', () => {
    expect(usesStaffNavigation({ isAdmin: false, categories: [{ staffRole: null }] })).toBe(false);
    expect(usesStaffNavigation({ isAdmin: false, categories: [] })).toBe(false);
  });
});
