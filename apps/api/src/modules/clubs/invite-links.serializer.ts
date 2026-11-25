import type { ClubCrest, InviteLink, InvitePreview } from '@repo/contracts';
import {
  canChangeInviteApproval,
  canRevokeInviteLink,
  type CategoryManager,
  type InviteLinkStatus,
} from '@repo/domain';

import type { InviteLinkRecord, InvitePreviewRecord } from './invite-links.repository.js';

export const serializeInviteLink = (
  link: InviteLinkRecord,
  token: string,
  manager: CategoryManager,
): InviteLink => ({
  id: link.id,
  categoryId: link.categoryId,
  role: link.role,
  isDefault: link.isDefault,
  token,
  requiresApproval: link.requiresApproval,
  expiresAt: link.expiresAt?.toISOString() ?? null,
  maxUses: link.maxUses,
  usesCount: link.usesCount,
  createdAt: link.createdAt.toISOString(),
  canRevoke: canRevokeInviteLink(manager, link),
  canChangeApproval: canChangeInviteApproval(manager, link),
});

export const serializeInvitePreview = (
  preview: InvitePreviewRecord,
  status: InviteLinkStatus,
  crest: ClubCrest | null,
): InvitePreview => ({
  status,
  role: preview.role,
  club: {
    name: preview.club.name,
    shortName: preview.club.shortName,
    primaryColor: preview.club.primaryColor,
    crest,
  },
  category: { name: preview.category.name, format: preview.category.format },
});
