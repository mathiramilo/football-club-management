import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { EmailSender } from '../../src/core/email/email-sender.js';
import {
  type FakeIdentityProvider,
  FakeEmailSender,
  fakeGoogleAndApple,
  sha256Hex,
  signInWithEmailCode,
  TEST_APPLE_CLIENT_IDS,
  TEST_GOOGLE_CLIENT_IDS,
  uniqueEmail,
  uniqueSubject,
} from '../support/auth-fixtures.js';
import { createTestApp } from '../support/create-test-app.js';

interface SignInBody {
  token: string;
  user: { id: string };
}

describe('POST /v1/auth/sign-in/social with an ID token (AUTH-01, AUTH-02)', () => {
  const email = new FakeEmailSender();
  let app: INestApplication<App>;
  let db: PrismaService;
  let google: FakeIdentityProvider;
  let apple: FakeIdentityProvider;

  const signIn = (provider: 'google' | 'apple', idToken: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/v1/auth/sign-in/social').send({ provider, idToken });

  beforeAll(async () => {
    ({ google, apple } = await fakeGoogleAndApple());
    app = await createTestApp((builder) => builder.overrideProvider(EmailSender).useValue(email));
    db = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it.each(Object.entries(TEST_GOOGLE_CLIENT_IDS))(
    'creates an account from a Google token minted for the %s client',
    async (_client, audience) => {
      const address = uniqueEmail('google');
      const token = await google.sign(
        { sub: uniqueSubject(), email: address, email_verified: true, name: 'Nicolás Pérez' },
        { audience },
      );

      await signIn('google', { token }).expect(200);

      const user = await db.user.findUniqueOrThrow({
        where: { email: address },
        include: { authIdentities: true },
      });
      expect(user).toMatchObject({ emailVerified: true, name: 'Nicolás Pérez' });
      expect(user.authIdentities).toMatchObject([{ provider: 'google', idToken: null }]);
    },
  );

  it('signs into the account that already holds the verified email (BR-AUTH-01)', async () => {
    const address = uniqueEmail('vincular');
    const byCode = await signInWithEmailCode(app, email, address);
    const token = await google.sign(
      { sub: uniqueSubject(), email: address, email_verified: true },
      { audience: TEST_GOOGLE_CLIENT_IDS.android },
    );

    const response = await signIn('google', { token }).expect(200);

    expect((response.body as SignInBody).user.id).toBe(byCode.userId);
  });

  it('never links an unverified provider email to an existing account (BR-AUTH-01)', async () => {
    const address = uniqueEmail('sin-verificar');
    await signInWithEmailCode(app, email, address);
    const token = await google.sign(
      { sub: uniqueSubject(), email: address, email_verified: false },
      { audience: TEST_GOOGLE_CLIENT_IDS.web },
    );

    const response = await signIn('google', { token });

    expect(response.status).toBe(401);
    expect(await db.authIdentity.count({ where: { user: { email: address } } })).toBe(0);
  });

  it('rejects a token minted for another app or by another issuer', async () => {
    const claims = { sub: uniqueSubject(), email: uniqueEmail('otra'), email_verified: true };

    await signIn('google', {
      token: await google.sign(claims, { audience: 'other-app.apps.googleusercontent.com' }),
    }).expect(401);
    await signIn('google', {
      token: await google.sign(claims, {
        audience: TEST_GOOGLE_CLIENT_IDS.ios,
        issuer: 'https://evil.example',
      }),
    }).expect(401);
    await signIn('google', {
      token: await apple.sign(claims, { audience: TEST_GOOGLE_CLIENT_IDS.ios }),
    }).expect(401);
  });

  it('accepts Apple with a private relay email and keeps the name sent on first sign-in (BR-AUTH-02)', async () => {
    const nonce = 'raw-nonce-from-the-app';
    const address = `${uniqueSubject()}@privaterelay.appleid.com`;
    const token = await apple.sign(
      {
        sub: uniqueSubject(),
        email: address,
        email_verified: 'true',
        is_private_email: 'true',
        nonce: sha256Hex(nonce),
      },
      { audience: TEST_APPLE_CLIENT_IDS.bundle },
    );

    await signIn('apple', {
      token,
      nonce,
      user: { name: { firstName: 'Lucía', lastName: 'Prueba' } },
    }).expect(200);

    const user = await db.user.findUniqueOrThrow({ where: { email: address } });
    expect(user.name).toBe('Lucía Prueba');
  });

  it('rejects an Apple token whose nonce does not match', async () => {
    const token = await apple.sign(
      {
        sub: uniqueSubject(),
        email: uniqueEmail('apple'),
        email_verified: 'true',
        nonce: sha256Hex('another-nonce'),
      },
      { audience: TEST_APPLE_CLIENT_IDS.bundle },
    );

    await signIn('apple', { token, nonce: 'raw-nonce-from-the-app' }).expect(401);
  });
});
