import { generateKeyPair } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../../../src/core/database/prisma.service.js';
import {
  APPLE_BUNDLE_ID,
  createFakeApple,
  createFakeGoogle,
  type FakeIdp,
  GOOGLE_CLIENT_IDS,
  nextSubject,
  serveJwks,
  sha256Hex,
} from '../support/fake-idp.js';
import { findOrCreateUser } from './accounts.js';
import { EmailCodes } from './email-codes.js';
import { appleProvider, createIdTokenVerifier, googleProvider } from './id-token-verifier.js';
import { SessionTokens } from './session-tokens.js';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const at = (base: Date, offsetMs: number) => new Date(base.getTime() + offsetMs);

describe('ADR-007 spike, track (c): our own tables on jose', () => {
  const db = new PrismaService(process.env.DATABASE_URL ?? '');
  let google: FakeIdp;
  let apple: FakeIdp;
  let tokens: SessionTokens;
  const codes = new EmailCodes(db, 'spike-only-pepper');
  const verifyGoogle = createIdTokenVerifier(
    googleProvider([GOOGLE_CLIENT_IDS.web, GOOGLE_CLIENT_IDS.ios, GOOGLE_CLIENT_IDS.android]),
  );
  const verifyApple = createIdTokenVerifier(appleProvider([APPLE_BUNDLE_ID]));

  beforeAll(async () => {
    google = await createFakeGoogle();
    apple = await createFakeApple();
    serveJwks([google, apple]);
    const { privateKey, publicKey } = await generateKeyPair('EdDSA');
    tokens = new SessionTokens(db, { kid: 'spike-1', privateKey, publicKey });
  });

  describe('ID tokens (AUTH-01, AUTH-02, BR-AUTH-01)', () => {
    it('verifies a Google token for any of our client IDs and rejects other audiences and issuers', async () => {
      const claims = { sub: nextSubject(), email: 'g@example.test', email_verified: true };

      await expect(
        verifyGoogle(await google.sign(claims, { audience: GOOGLE_CLIENT_IDS.android })),
      ).resolves.toMatchObject({
        provider: 'google',
        emailVerified: true,
      });
      await expect(
        verifyGoogle(await google.sign(claims, { audience: 'other.apps.googleusercontent.com' })),
      ).rejects.toThrow('ID_TOKEN_INVALID');
      await expect(
        verifyGoogle(
          await google.sign(claims, {
            audience: GOOGLE_CLIENT_IDS.ios,
            issuer: 'https://evil.example',
          }),
        ),
      ).rejects.toThrow('ID_TOKEN_INVALID');
      await expect(
        verifyGoogle(await apple.sign(claims, { audience: GOOGLE_CLIENT_IDS.ios })),
      ).rejects.toThrow('ID_TOKEN_INVALID');
    });

    it('checks the Apple nonce, hashed or raw', async () => {
      const claims = {
        sub: nextSubject(),
        email: 'relay@privaterelay.appleid.com',
        email_verified: 'true',
      };

      await expect(
        verifyApple(
          await apple.sign({ ...claims, nonce: sha256Hex('n-1') }, { audience: APPLE_BUNDLE_ID }),
          'n-1',
        ),
      ).resolves.toMatchObject({ emailVerified: true });
      await expect(
        verifyApple(
          await apple.sign({ ...claims, nonce: sha256Hex('n-2') }, { audience: APPLE_BUNDLE_ID }),
          'n-1',
        ),
      ).rejects.toThrow('ID_TOKEN_INVALID');
    });

    it('links a second provider by verified email and refuses an unverified one', async () => {
      const now = new Date();
      const email = `link-${nextSubject()}@example.test`;
      const fromCode = await findOrCreateUser(
        db,
        { provider: 'email', subject: email, email, emailVerified: true },
        now,
      );

      const fromGoogle = await findOrCreateUser(
        db,
        { provider: 'google', subject: nextSubject(), email, emailVerified: true },
        now,
      );
      expect(fromGoogle).toBe(fromCode);

      await expect(
        findOrCreateUser(
          db,
          { provider: 'google', subject: nextSubject(), email, emailVerified: false },
          now,
        ),
      ).rejects.toThrow('EMAIL_NOT_VERIFIED');
    });
  });

  describe('email codes (AUTH-03, BR-AUTH-03, NFR-SEC-05)', () => {
    it('issues a 6-digit code stored as an HMAC, accepts it once', async () => {
      const now = new Date();
      const email = `code-${nextSubject()}@example.test`;
      const code = await codes.start(email, now);

      expect(code).toMatch(/^\d{6}$/);
      const row = await db.emailCode.findFirstOrThrow({ where: { email } });
      expect(row.codeHash).not.toContain(code);
      await codes.verify(email, code, at(now, MINUTE));
      await expect(codes.verify(email, code, at(now, MINUTE))).rejects.toThrow('CODE_INVALID');
    });

    it('tells wrong from expired, and locks after 5 attempts', async () => {
      const now = new Date();
      const email = `wrong-${nextSubject()}@example.test`;
      const code = await codes.start(email, now);
      const wrong = code === '000000' ? '111111' : '000000';

      for (let attempt = 1; attempt <= 5; attempt++) {
        await expect(codes.verify(email, wrong, now)).rejects.toThrow('CODE_INVALID');
      }
      await expect(codes.verify(email, code, now)).rejects.toThrow('CODE_TOO_MANY_ATTEMPTS');

      const fresh = await codes.start(email, at(now, 2 * MINUTE));
      await expect(codes.verify(email, fresh, at(now, 13 * MINUTE))).rejects.toThrow(
        'CODE_EXPIRED',
      );
    });

    it('allows a resend after 60 s and at most 5 codes per email per hour, whatever the IP', async () => {
      const now = new Date();
      const email = `limit-${nextSubject()}@example.test`;
      await codes.start(email, now);

      await expect(codes.start(email, at(now, 30_000))).rejects.toThrow('CODE_RESEND_TOO_SOON');
      for (let i = 1; i <= 4; i++) await codes.start(email, at(now, i * 2 * MINUTE));
      await expect(codes.start(email, at(now, 10 * 2 * MINUTE))).rejects.toThrow(
        'CODE_RATE_LIMITED',
      );
      await expect(codes.start(email, at(now, 61 * MINUTE))).resolves.toMatch(/^\d{6}$/);
    });
  });

  describe('sessions (BR-AUTH-04, NFR-SEC-11, AUTH-12)', () => {
    async function signedInUser(platform: 'ios' | 'web' = 'ios') {
      const now = new Date();
      const email = `session-${nextSubject()}@example.test`;
      const userId = await findOrCreateUser(
        db,
        { provider: 'email', subject: email, email, emailVerified: true },
        now,
      );
      return { now, userId, pair: await tokens.issue(userId, platform, now) };
    }

    it('stores only a hash of the refresh token and rotates it on every refresh', async () => {
      const { now, userId, pair } = await signedInUser();

      const stored = await db.refreshToken.findFirstOrThrow({ where: { userId } });
      expect(stored.tokenHash).not.toBe(pair.refreshToken);
      const next = await tokens.refresh(pair.refreshToken, at(now, MINUTE));
      expect(next.refreshToken).not.toBe(pair.refreshToken);
      expect(next.familyId).toBe(pair.familyId);
      await expect(
        tokens.verifyAccess(next.accessToken, at(now, MINUTE), { checkRevoked: true }),
      ).resolves.toEqual({
        userId,
        familyId: pair.familyId,
      });
    });

    it('detects reuse of a rotated token and revokes the whole family', async () => {
      const { now, pair } = await signedInUser();
      const next = await tokens.refresh(pair.refreshToken, at(now, MINUTE));

      await expect(tokens.refresh(pair.refreshToken, at(now, 2 * MINUTE))).rejects.toThrow(
        'REFRESH_TOKEN_REUSED',
      );

      await expect(tokens.refresh(next.refreshToken, at(now, 3 * MINUTE))).rejects.toThrow(
        'REFRESH_TOKEN_INVALID',
      );
      await expect(
        tokens.verifyAccess(next.accessToken, at(now, 3 * MINUTE), { checkRevoked: true }),
      ).rejects.toThrow('SESSION_REVOKED');
    });

    it('lets exactly one of two concurrent refreshes win', async () => {
      const { now, pair } = await signedInUser();

      const results = await Promise.allSettled([
        tokens.refresh(pair.refreshToken, at(now, MINUTE)),
        tokens.refresh(pair.refreshToken, at(now, MINUTE)),
      ]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    });

    it('expires after 30 idle days on web and 90 on mobile', async () => {
      const web = await signedInUser('web');
      await expect(tokens.refresh(web.pair.refreshToken, at(web.now, 31 * DAY))).rejects.toThrow(
        'REFRESH_TOKEN_EXPIRED',
      );

      const mobile = await signedInUser('ios');
      const day89 = await tokens.refresh(mobile.pair.refreshToken, at(mobile.now, 89 * DAY));
      await expect(
        tokens.refresh(day89.refreshToken, at(mobile.now, 170 * DAY)),
      ).resolves.toBeDefined();
    });

    it('signs out every device: stateless checks keep working until expiry, revocation checks fail at once', async () => {
      const { now, userId, pair } = await signedInUser();
      const tablet = await tokens.issue(userId, 'android', now);

      await tokens.revokeAll(userId, at(now, MINUTE));

      await expect(
        tokens.verifyAccess(tablet.accessToken, at(now, MINUTE), { checkRevoked: false }),
      ).resolves.toBeDefined();
      await expect(
        tokens.verifyAccess(tablet.accessToken, at(now, MINUTE), { checkRevoked: true }),
      ).rejects.toThrow('SESSION_REVOKED');
      await expect(
        tokens.verifyAccess(pair.accessToken, at(now, 16 * MINUTE), { checkRevoked: false }),
      ).rejects.toThrow('ACCESS_TOKEN_INVALID');
      await expect(tokens.refresh(tablet.refreshToken, at(now, 2 * MINUTE))).rejects.toThrow(
        'REFRESH_TOKEN_INVALID',
      );
    });
  });
});
