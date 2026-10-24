import { accountPolicy, type PolicyMap } from '../../src/core/authorization/policy.js';

export const signedInTestPolicies = {
  'test.account.use': accountPolicy({ allows: () => true }),
} satisfies PolicyMap;

export const SIGNED_IN_TEST_ACTION = 'test.account.use';
