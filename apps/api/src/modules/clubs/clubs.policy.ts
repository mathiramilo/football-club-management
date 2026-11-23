import { accountPolicy, clubPolicy, type PolicyMap } from '../../core/authorization/policy.js';

const anySignedInUser = accountPolicy({ allows: () => true });

export const clubsPolicies = {
  'clubs.club.create': anySignedInUser,
  'clubs.own-memberships.read': anySignedInUser,
  // Permission matrix § 4.1, "Edit club profile and settings": Owner and Club Admin.
  'clubs.profile.update': clubPolicy({ allows: (actor) => actor.isAdmin }),
} satisfies PolicyMap;
