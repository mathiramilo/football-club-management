export type InviteRole = 'player' | 'coach' | 'dt';

export type InviteLinkStatus = 'active' | 'expired' | 'revoked' | 'used_up';

export interface CategoryRoles {
  isAdmin: boolean;
  staffRole: string | null;
}

export interface CategoryManager extends CategoryRoles {
  userId: string;
}

export interface ManagedInviteLink {
  role: InviteRole;
  requiresApproval: boolean;
  createdBy: string | null;
}

export interface InviteLinkUsage {
  revokedAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  usesCount: number;
}

const isDt = (manager: CategoryRoles) => manager.staffRole === 'dt';
const isCoach = (manager: CategoryRoles) => manager.staffRole === 'coach';

// BR-CLUB-08: DT links only by Club Admins, Coach links by Club Admins or DTs, player links by all staff.
export function creatableInviteRoles(manager: CategoryRoles): InviteRole[] {
  if (manager.isAdmin) return ['player', 'coach', 'dt'];
  if (isDt(manager)) return ['player', 'coach'];
  if (isCoach(manager)) return ['player'];
  return [];
}

// BR-CLUB-08: staff links and player links created by Coaches always require approval.
export function inviteApprovalRequired(manager: CategoryRoles, role: InviteRole): boolean {
  return role !== 'player' || !(manager.isAdmin || isDt(manager));
}

export function canSeeInviteLink(manager: CategoryManager, link: ManagedInviteLink): boolean {
  if (!creatableInviteRoles(manager).includes(link.role)) return false;
  return !isCoach(manager) || manager.isAdmin || link.requiresApproval;
}

export function canRevokeInviteLink(manager: CategoryManager, link: ManagedInviteLink): boolean {
  if (!canSeeInviteLink(manager, link)) return false;
  return manager.isAdmin || isDt(manager) || link.createdBy === manager.userId;
}

export function canChangeInviteApproval(
  manager: CategoryManager,
  link: ManagedInviteLink,
): boolean {
  return link.role === 'player' && !inviteApprovalRequired(manager, link.role);
}

// BR-AUTH-10: a link stops working once revoked, past its expiry or at its maximum number of uses.
export function inviteLinkStatus(link: InviteLinkUsage, now: Date): InviteLinkStatus {
  if (link.revokedAt !== null) return 'revoked';
  if (link.expiresAt !== null && link.expiresAt.getTime() <= now.getTime()) return 'expired';
  if (link.maxUses !== null && link.usesCount >= link.maxUses) return 'used_up';
  return 'active';
}
