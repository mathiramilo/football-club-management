import { canChangeInviteApproval, canRevokeInviteLink, creatableInviteRoles } from '@repo/domain';

import { accountPolicy, clubPolicy, type PolicyMap } from '../../core/authorization/policy.js';
import { categoryManager, InviteCategoryLoader, InviteLinkLoader } from './invite-link-scopes.js';

const anySignedInUser = accountPolicy({ allows: () => true });

// Permission matrix § 4.1, "Create player invite links" and "Create staff invite links" (BR-CLUB-08).
const managesInviteLinks = clubPolicy({
  loader: InviteCategoryLoader,
  allows: (actor, category) => creatableInviteRoles(categoryManager(actor, category.id)).length > 0,
});

export const clubsPolicies = {
  'clubs.club.create': anySignedInUser,
  'clubs.own-memberships.read': anySignedInUser,
  // Permission matrix § 4.1, "Edit club profile and settings": Owner and Club Admin.
  'clubs.profile.update': clubPolicy({ allows: (actor) => actor.isAdmin }),
  'clubs.invite-links.read': managesInviteLinks,
  'clubs.invite-links.create': managesInviteLinks,
  'clubs.invite-links.revoke': clubPolicy({
    loader: InviteLinkLoader,
    allows: (actor, link) => canRevokeInviteLink(categoryManager(actor, link.categoryId), link),
  }),
  'clubs.invite-links.update': clubPolicy({
    loader: InviteLinkLoader,
    allows: (actor, link) => canChangeInviteApproval(categoryManager(actor, link.categoryId), link),
  }),
} satisfies PolicyMap;
