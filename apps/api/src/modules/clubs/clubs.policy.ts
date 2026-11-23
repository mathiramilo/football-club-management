import { accountPolicy, type PolicyMap } from '../../core/authorization/policy.js';

const anySignedInUser = accountPolicy({ allows: () => true });

export const clubsPolicies = {
  'clubs.club.create': anySignedInUser,
  'clubs.own-memberships.read': anySignedInUser,
} satisfies PolicyMap;
