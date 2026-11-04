import { inject } from 'vitest';

import {
  TEST_APPLE_CLIENT_IDS,
  TEST_APPLE_SIGNING_KEY,
  TEST_GOOGLE_CLIENT_IDS,
  TEST_GOOGLE_CLIENT_SECRET,
  TEST_WEB_ORIGIN,
} from './auth-fixtures.js';

process.env.DATABASE_URL = inject('databaseUrl');
process.env.BETTER_AUTH_SECRET = 'test-only-secret-with-enough-entropy-0123456789';
process.env.WEB_ORIGINS = TEST_WEB_ORIGIN;
process.env.GOOGLE_CLIENT_IDS = Object.values(TEST_GOOGLE_CLIENT_IDS).join(',');
process.env.GOOGLE_CLIENT_SECRET = TEST_GOOGLE_CLIENT_SECRET;
process.env.APPLE_CLIENT_IDS = Object.values(TEST_APPLE_CLIENT_IDS).join(',');
process.env.APPLE_TEAM_ID = TEST_APPLE_SIGNING_KEY.teamId;
process.env.APPLE_KEY_ID = TEST_APPLE_SIGNING_KEY.keyId;
process.env.APPLE_PRIVATE_KEY = TEST_APPLE_SIGNING_KEY.privateKey;
process.env.AUTH_RATE_LIMIT_ENABLED = 'false';
