import { createHmac } from 'node:crypto';

import type { LoggerService } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { bearer } from 'better-auth/plugins/bearer';
import { emailOTP } from 'better-auth/plugins/email-otp';

import type { Clock } from '../clock/clock.js';
import type { PrismaService } from '../database/prisma.service.js';
import type { EmailSender } from '../email/email-sender.js';
import { formatMessage } from '../i18n/messages.js';
import type { EmailCodeRequestsRepository } from './email-code-requests.repository.js';

export const AUTH_BASE_PATH = '/v1/auth';

const DAY_SECONDS = 24 * 60 * 60;
// BR-AUTH-04 and D-17: a session ends after 90 days without use, on every device.
const SESSION_IDLE_DAYS = 90;
// BR-AUTH-03: 6 digits, valid 10 minutes, at most 5 attempts.
const SIGN_IN_CODE_TTL_MINUTES = 10;
const SIGN_IN_CODE_ATTEMPTS = 5;
const SEND_CODE_PATH = '/email-otp/send-verification-otp';
// NFR-SEC-05: at most 30 code requests per IP per hour.
const CODE_REQUESTS_PER_IP_PER_HOUR = 30;

const UNUSED_PATHS = [
  '/account-info',
  '/change-email',
  '/change-password',
  '/delete-user',
  '/delete-user/callback',
  '/email-otp/change-email',
  '/email-otp/check-verification-otp',
  '/email-otp/request-email-change',
  '/email-otp/request-password-reset',
  '/email-otp/reset-password',
  '/email-otp/verify-email',
  '/forget-password/email-otp',
  '/get-access-token',
  '/link-social',
  '/list-accounts',
  '/refresh-token',
  '/request-password-reset',
  '/reset-password',
  '/send-verification-email',
  '/sign-in/email',
  '/sign-up/email',
  '/unlink-account',
  '/update-session',
  '/update-user',
  '/verify-email',
  '/verify-password',
];

export interface AuthOptions {
  baseUrl: string;
  secret: string;
  webOrigins: string[];
  googleClientIds: string[];
  appleClientIds: string[];
  rateLimitEnabled: boolean;
  trustedProxies: string[];
}

export interface AuthDependencies {
  prisma: PrismaService;
  emailSender: EmailSender;
  emailCodeRequests: EmailCodeRequestsRepository;
  clock: Clock;
  logger: LoggerService;
}

const withoutProviderSecrets = <T extends object>(account: T) =>
  Promise.resolve({
    data: { ...account, accessToken: null, refreshToken: null, idToken: null, password: null },
  });

const emailOf = (body: unknown) =>
  typeof body === 'object' && body !== null && 'email' in body && typeof body.email === 'string'
    ? body.email.trim().toLowerCase()
    : undefined;

export function createAuth(
  options: AuthOptions,
  { prisma, emailSender, emailCodeRequests, clock, logger }: AuthDependencies,
) {
  const [appleClientId] = options.appleClientIds;
  const hashEmail = (email: string) =>
    createHmac('sha256', options.secret).update(`email-code:${email}`).digest('base64url');

  return betterAuth({
    appName: 'Football Club Management',
    baseURL: options.baseUrl,
    basePath: AUTH_BASE_PATH,
    secret: options.secret,
    trustedOrigins: options.webOrigins,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    user: { modelName: 'user' },
    session: {
      modelName: 'authSession',
      expiresIn: SESSION_IDLE_DAYS * DAY_SECONDS,
      updateAge: DAY_SECONDS,
    },
    account: {
      modelName: 'authIdentity',
      fields: { accountId: 'providerSubject', providerId: 'provider' },
      accountLinking: { enabled: true },
    },
    verification: { modelName: 'authVerification' },
    socialProviders: {
      ...(options.googleClientIds.length > 0 && {
        google: { clientId: options.googleClientIds },
      }),
      ...(appleClientId && {
        apple: { clientId: appleClientId, audience: options.appleClientIds },
      }),
    },
    plugins: [
      bearer(),
      emailOTP({
        otpLength: 6,
        expiresIn: SIGN_IN_CODE_TTL_MINUTES * 60,
        allowedAttempts: SIGN_IN_CODE_ATTEMPTS,
        storeOTP: 'hashed',
        sendVerificationOTP: ({ email, otp }) =>
          emailSender.send({
            to: email,
            subject: formatMessage('email.signInCode.subject'),
            text: formatMessage('email.signInCode.text', {
              code: otp,
              minutes: SIGN_IN_CODE_TTL_MINUTES,
            }),
          }),
      }),
    ],
    disabledPaths: UNUSED_PATHS,
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const email = ctx.path === SEND_CODE_PATH ? emailOf(ctx.body) : undefined;
        if (!email) return;
        const decision = await emailCodeRequests.reserve(hashEmail(email), clock.now());
        if (!decision.allowed) {
          throw new APIError(
            'TOO_MANY_REQUESTS',
            { code: decision.code, message: 'Too many sign-in codes requested for this email' },
            { 'Retry-After': String(decision.retryAfterSeconds) },
          );
        }
      }),
    },
    rateLimit: {
      enabled: options.rateLimitEnabled,
      storage: 'database',
      modelName: 'authRateLimit',
      customRules: { [SEND_CODE_PATH]: { window: 3600, max: CODE_REQUESTS_PER_IP_PER_HOUR } },
    },
    databaseHooks: {
      account: {
        create: { before: withoutProviderSecrets },
        update: { before: withoutProviderSecrets },
      },
    },
    // Better Auth skips its CSRF origin check under a test runner unless this is set explicitly.
    advanced: {
      database: { generateId: false },
      disableOriginCheck: false,
      // Without a resolvable client IP, Better Auth puts every caller in one shared rate-limit bucket.
      ipAddress: { trustedProxies: options.trustedProxies },
    },
    telemetry: { enabled: false },
    // Its log arguments can carry request data such as emails; only the message is kept.
    logger: {
      log: (level, message) => {
        if (level === 'error') logger.error(message);
        else if (level === 'warn') logger.warn(message);
        else logger.debug?.(message);
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
