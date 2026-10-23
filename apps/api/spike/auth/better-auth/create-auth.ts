import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins/bearer';
import { emailOTP } from 'better-auth/plugins/email-otp';

import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { APPLE_BUNDLE_ID, APPLE_SERVICE_ID, GOOGLE_CLIENT_IDS } from '../support/fake-idp.js';

const DAY_SECONDS = 24 * 60 * 60;

export interface SpikeAuthOptions {
  sentCodes: Map<string, string>;
  rateLimit?: boolean;
}

export function createSpikeAuth(prisma: PrismaClient, options: SpikeAuthOptions) {
  return betterAuth({
    appName: 'Football Club Management',
    baseURL: 'http://localhost:3001',
    basePath: '/v1/auth/ba',
    secret: 'spike-only-secret-with-enough-entropy-0123456789',
    trustedOrigins: ['http://localhost:3000'],
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    // Better Auth skips its CSRF origin check under a test runner unless this is set explicitly.
    advanced: { database: { generateId: false }, disableOriginCheck: false },
    user: { modelName: 'user' },
    session: { modelName: 'baSession', expiresIn: 90 * DAY_SECONDS, updateAge: DAY_SECONDS },
    account: { modelName: 'baAccount', accountLinking: { enabled: true } },
    verification: { modelName: 'baVerification' },
    socialProviders: {
      google: {
        clientId: [GOOGLE_CLIENT_IDS.web, GOOGLE_CLIENT_IDS.ios, GOOGLE_CLIENT_IDS.android],
        clientSecret: 'unused-for-id-token-sign-in',
        mapProfileToUser: () => ({ image: undefined }),
      },
      apple: {
        clientId: APPLE_SERVICE_ID,
        clientSecret: 'unused-for-id-token-sign-in',
        audience: [APPLE_BUNDLE_ID, APPLE_SERVICE_ID],
        mapProfileToUser: () => ({ image: undefined }),
      },
    },
    plugins: [
      bearer(),
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 5,
        storeOTP: 'hashed',
        sendVerificationOTP: ({ email, otp }) => {
          options.sentCodes.set(email, otp);
          return Promise.resolve();
        },
      }),
    ],
    rateLimit: { enabled: options.rateLimit ?? false },
    // Provider ID tokens carry name and email; we have no use for them after sign-in.
    databaseHooks: {
      account: {
        create: {
          before: (account) =>
            Promise.resolve({ data: { ...account, idToken: null, accessToken: null } }),
        },
        update: {
          before: (account) =>
            Promise.resolve({ data: { ...account, idToken: null, accessToken: null } }),
        },
      },
    },
  });
}

export type SpikeAuth = ReturnType<typeof createSpikeAuth>;
