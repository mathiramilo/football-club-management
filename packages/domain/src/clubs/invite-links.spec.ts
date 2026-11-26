import { describe, expect, it } from 'vitest';

import {
  canChangeInviteApproval,
  canRevokeInviteLink,
  canSeeInviteLink,
  type CategoryManager,
  creatableInviteRoles,
  holdsInviteRole,
  inviteAcceptOutcome,
  inviteApprovalRequired,
  type InviteRole,
  inviteLinkStatus,
  type ManagedInviteLink,
} from './invite-links.js';

const admin: CategoryManager = { userId: 'admin', isAdmin: true, staffRole: null };
const dt: CategoryManager = { userId: 'dt', isAdmin: false, staffRole: 'dt' };
const coach: CategoryManager = { userId: 'coach', isAdmin: false, staffRole: 'coach' };
const adminCoach: CategoryManager = { userId: 'admin-coach', isAdmin: true, staffRole: 'coach' };
const player: CategoryManager = { userId: 'player', isAdmin: false, staffRole: null };
const physio: CategoryManager = { userId: 'physio', isAdmin: false, staffRole: 'physio' };

const link = (role: InviteRole, overrides: Partial<ManagedInviteLink> = {}): ManagedInviteLink => ({
  role,
  requiresApproval: true,
  createdBy: 'someone-else',
  ...overrides,
});

describe('creatableInviteRoles (BR-CLUB-08)', () => {
  it('lets Club Admins create every role', () => {
    expect(creatableInviteRoles(admin)).toEqual(['player', 'coach', 'dt']);
    expect(creatableInviteRoles(adminCoach)).toEqual(['player', 'coach', 'dt']);
  });

  it('lets DTs create player and Coach links', () => {
    expect(creatableInviteRoles(dt)).toEqual(['player', 'coach']);
  });

  it('lets Coaches create player links only', () => {
    expect(creatableInviteRoles(coach)).toEqual(['player']);
  });

  it('gives players and unknown staff roles nothing', () => {
    expect(creatableInviteRoles(player)).toEqual([]);
    expect(creatableInviteRoles(physio)).toEqual([]);
  });
});

describe('inviteApprovalRequired (BR-CLUB-08, OQ-08)', () => {
  it('always requires approval on staff links', () => {
    expect(inviteApprovalRequired(admin, 'coach')).toBe(true);
    expect(inviteApprovalRequired(admin, 'dt')).toBe(true);
    expect(inviteApprovalRequired(dt, 'coach')).toBe(true);
  });

  it('always requires approval on player links created by Coaches', () => {
    expect(inviteApprovalRequired(coach, 'player')).toBe(true);
  });

  it('lets Club Admins and DTs create player links without approval', () => {
    expect(inviteApprovalRequired(admin, 'player')).toBe(false);
    expect(inviteApprovalRequired(adminCoach, 'player')).toBe(false);
    expect(inviteApprovalRequired(dt, 'player')).toBe(false);
  });
});

describe('canSeeInviteLink', () => {
  it('shows each manager the roles they could create', () => {
    expect(canSeeInviteLink(admin, link('dt'))).toBe(true);
    expect(canSeeInviteLink(dt, link('coach'))).toBe(true);
    expect(canSeeInviteLink(dt, link('dt'))).toBe(false);
    expect(canSeeInviteLink(coach, link('coach'))).toBe(false);
  });

  it('hides player links without approval from Coaches', () => {
    expect(canSeeInviteLink(coach, link('player', { requiresApproval: false }))).toBe(false);
    expect(canSeeInviteLink(coach, link('player'))).toBe(true);
    expect(canSeeInviteLink(adminCoach, link('player', { requiresApproval: false }))).toBe(true);
  });

  it('shows players nothing', () => {
    expect(canSeeInviteLink(player, link('player'))).toBe(false);
  });
});

describe('canRevokeInviteLink', () => {
  it('lets Club Admins and DTs revoke every link they see', () => {
    expect(canRevokeInviteLink(admin, link('dt'))).toBe(true);
    expect(canRevokeInviteLink(dt, link('player', { createdBy: null }))).toBe(true);
    expect(canRevokeInviteLink(dt, link('dt'))).toBe(false);
  });

  it('lets Coaches revoke only their own links', () => {
    expect(canRevokeInviteLink(coach, link('player', { createdBy: 'coach' }))).toBe(true);
    expect(canRevokeInviteLink(coach, link('player'))).toBe(false);
    expect(canRevokeInviteLink(coach, link('player', { createdBy: null }))).toBe(false);
  });
});

describe('canChangeInviteApproval', () => {
  it('lets Club Admins and DTs change approval on player links', () => {
    expect(canChangeInviteApproval(admin, link('player'))).toBe(true);
    expect(canChangeInviteApproval(dt, link('player'))).toBe(true);
  });

  it('never allows it on staff links or for Coaches', () => {
    expect(canChangeInviteApproval(admin, link('coach'))).toBe(false);
    expect(canChangeInviteApproval(coach, link('player', { createdBy: 'coach' }))).toBe(false);
  });
});

describe('inviteLinkStatus (BR-AUTH-10)', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const usable = { revokedAt: null, expiresAt: null, maxUses: null, usesCount: 0 };

  it('is active while not revoked, expired or used up', () => {
    expect(inviteLinkStatus(usable, now)).toBe('active');
    expect(
      inviteLinkStatus(
        { ...usable, expiresAt: new Date('2026-11-24T12:00:01Z'), maxUses: 3, usesCount: 2 },
        now,
      ),
    ).toBe('active');
  });

  it('expires at its expiry instant', () => {
    expect(inviteLinkStatus({ ...usable, expiresAt: now }, now)).toBe('expired');
  });

  it('is used up at its maximum number of uses', () => {
    expect(inviteLinkStatus({ ...usable, maxUses: 3, usesCount: 3 }, now)).toBe('used_up');
  });

  it('reports revoked before expired or used up', () => {
    expect(
      inviteLinkStatus(
        { revokedAt: now, expiresAt: new Date('2026-01-01T00:00:00Z'), maxUses: 1, usesCount: 1 },
        now,
      ),
    ).toBe('revoked');
  });
});

describe('holdsInviteRole (BR-AUTH-09)', () => {
  it('needs the player flag for player links', () => {
    expect(holdsInviteRole({ isPlayer: true, staffRole: null }, 'player')).toBe(true);
    expect(holdsInviteRole({ isPlayer: false, staffRole: 'dt' }, 'player')).toBe(false);
  });

  it('counts a DT as holding the Coach role, but not the other way round', () => {
    expect(holdsInviteRole({ isPlayer: false, staffRole: 'dt' }, 'coach')).toBe(true);
    expect(holdsInviteRole({ isPlayer: false, staffRole: 'coach' }, 'coach')).toBe(true);
    expect(holdsInviteRole({ isPlayer: false, staffRole: 'coach' }, 'dt')).toBe(false);
  });

  it('holds nothing without a membership in the category', () => {
    expect(holdsInviteRole(null, 'player')).toBe(false);
  });
});

describe('inviteAcceptOutcome (BR-AUTH-09)', () => {
  const open = { role: 'player', requiresApproval: false } as const;
  const approval = { role: 'player', requiresApproval: true } as const;

  it('joins immediately through a player link without approval', () => {
    expect(inviteAcceptOutcome(open, null, false)).toBe('joined');
  });

  it('joins a staff member of the category as a player too', () => {
    expect(inviteAcceptOutcome(open, { isPlayer: false, staffRole: 'coach' }, false)).toBe(
      'joined',
    );
  });

  it('creates a request when the link requires approval', () => {
    expect(inviteAcceptOutcome(approval, null, false)).toBe('requested');
  });

  it('always creates a request for staff links', () => {
    expect(inviteAcceptOutcome({ role: 'coach', requiresApproval: false }, null, false)).toBe(
      'requested',
    );
  });

  it('sends someone who already holds the role straight to the category', () => {
    expect(inviteAcceptOutcome(approval, { isPlayer: true, staffRole: null }, true)).toBe(
      'already_member',
    );
  });

  it('keeps a single pending request', () => {
    expect(inviteAcceptOutcome(approval, null, true)).toBe('already_requested');
    expect(inviteAcceptOutcome(open, null, true)).toBe('already_requested');
  });
});
