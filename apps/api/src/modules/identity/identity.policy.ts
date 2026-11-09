import { accountPolicy, type PolicyMap } from '../../core/authorization/policy.js';

const anySignedInUser = accountPolicy({ allows: () => true });

export const identityPolicies = {
  'identity.legal.read': anySignedInUser,
  'identity.legal.accept': anySignedInUser,
} satisfies PolicyMap;
