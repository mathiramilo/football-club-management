import { z } from 'zod';

import { extensibleEnum } from '../extensible-enum.js';
import { categoryFormats, clubCrest } from './club.js';

export const inviteRoles = ['player', 'coach', 'dt'] as const;
export const inviteRole = z.enum(inviteRoles);
export type InviteRole = z.infer<typeof inviteRole>;

export const INVITE_LINK_DEFAULT_EXPIRY_DAYS = 30;
export const INVITE_LINK_MAX_EXPIRY_DAYS = 90;

export const inviteLink = z
  .object({
    id: z.uuid(),
    categoryId: z.uuid(),
    role: extensibleEnum(inviteRoles),
    isDefault: z
      .boolean()
      .describe("The category's player link: it never expires and has no use limit (CLUB-05)"),
    token: z.string().describe('The link is <web origin>/j/<token>'),
    requiresApproval: z.boolean(),
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
    maxUses: z.int().nullable(),
    usesCount: z.int(),
    createdAt: z.iso.datetime({ offset: true }),
    canRevoke: z.boolean(),
    canChangeApproval: z.boolean(),
  })
  .meta({ id: 'InviteLink' });

export const inviteLinksResponse = z
  .object({
    items: z
      .array(inviteLink)
      .describe(
        'Active links the caller may share: not revoked, expired or used up. The default link first, then newest first',
      ),
  })
  .meta({ id: 'InviteLinksResponse' });

export const createInviteLinkBody = z
  .object({
    role: inviteRole,
    requiresApproval: z
      .boolean()
      .optional()
      .describe(
        'Default true. Only player links created by a DT or Club Admin may turn it off (BR-CLUB-08)',
      ),
    expiresInDays: z
      .int()
      .min(1)
      .max(INVITE_LINK_MAX_EXPIRY_DAYS)
      .optional()
      .describe(`Default ${String(INVITE_LINK_DEFAULT_EXPIRY_DAYS)} (BR-AUTH-10)`),
    maxUses: z.int().min(1).max(1000).nullable().optional(),
  })
  .refine((body) => body.role === 'player' || body.requiresApproval !== false, {
    path: ['requiresApproval'],
    message: 'Staff links always require approval (BR-CLUB-08)',
  })
  .meta({ id: 'CreateInviteLinkBody' });

export const updateInviteLinkBody = z
  .object({ requiresApproval: z.boolean() })
  .meta({ id: 'UpdateInviteLinkBody' });

export const inviteLinkStatuses = ['active', 'expired', 'revoked', 'used_up'] as const;
export const inviteLinkStatus = extensibleEnum(inviteLinkStatuses);
export type InviteLinkStatus = z.infer<typeof inviteLinkStatus>;

export const invitePreview = z
  .object({
    status: inviteLinkStatus,
    role: extensibleEnum(inviteRoles),
    club: z.object({
      name: z.string(),
      shortName: z.string().nullable(),
      primaryColor: z.string().nullable(),
      crest: clubCrest.nullable(),
    }),
    category: z.object({ name: z.string(), format: extensibleEnum(categoryFormats) }),
  })
  .describe('What the link invites to, shown before sign-in (BR-AUTH-09). No personal data')
  .meta({ id: 'InvitePreview' });

export type InviteLink = z.infer<typeof inviteLink>;
export type InviteLinksResponse = z.infer<typeof inviteLinksResponse>;
export type CreateInviteLinkBody = z.infer<typeof createInviteLinkBody>;
export type UpdateInviteLinkBody = z.infer<typeof updateInviteLinkBody>;
export type InvitePreview = z.infer<typeof invitePreview>;
