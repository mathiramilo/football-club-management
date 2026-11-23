import { accountPolicy, type PolicyMap } from '../../core/authorization/policy.js';

const anySignedInUser = accountPolicy({ allows: () => true });

export const identityPolicies = {
  'identity.legal.read': anySignedInUser,
  'identity.legal.accept': anySignedInUser,
  'identity.profile.read': anySignedInUser,
  'identity.profile.update': anySignedInUser,
} satisfies PolicyMap;
