import {
  type CanActivate,
  Controller,
  type ExecutionContext,
  Get,
  Inject,
  Injectable,
  type INestApplication,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import type { Express, Request } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../../src/app.module.js';
import { configureApp } from '../../../src/core/configure-app.js';
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
import { createSpikeAuth, type SpikeAuth } from './create-auth.js';

const BETTER_AUTH = Symbol('BETTER_AUTH');

interface SignInBody {
  token: string;
  user: { id: string };
}

const errorCode = (response: { body: unknown }) => (response.body as { code?: string }).code;
const WEB_ORIGIN = 'http://localhost:3000';

@Injectable()
class SessionGuard implements CanActivate {
  constructor(@Inject(BETTER_AUTH) private readonly auth: SpikeAuth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { userId?: string }>();
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) throw new UnauthorizedException();
    req.userId = session.user.id;
    return true;
  }
}

@Controller('spike/me')
class MeController {
  @Get()
  @UseGuards(SessionGuard)
  me(@Req() req: Request & { userId?: string }) {
    return { userId: req.userId };
  }
}

async function createApp(sentCodes: Map<string, string>, rateLimit = false) {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [MeController],
    providers: [
      SessionGuard,
      {
        provide: BETTER_AUTH,
        inject: [PrismaService],
        useFactory: (prisma: PrismaService) => createSpikeAuth(prisma, { sentCodes, rateLimit }),
      },
    ],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  // Better Auth reads the raw body, so it must run before Nest registers its body parser in init().
  const express = app.getHttpAdapter().getInstance() as Express;
  express.all('/v1/auth/ba/*splat', toNodeHandler(app.get<SpikeAuth>(BETTER_AUTH)));
  await app.init();
  return app;
}

describe('ADR-007 spike, track (a): Better Auth 1.7.12 inside NestJS 12', () => {
  const sentCodes = new Map<string, string>();
  let app: INestApplication<App>;
  let db: PrismaService;
  let google: FakeIdp;
  let apple: FakeIdp;

  const http = () => request(app.getHttpServer());

  async function signInWithEmailCode(email: string) {
    await http()
      .post('/v1/auth/ba/email-otp/send-verification-otp')
      .send({ email, type: 'sign-in' })
      .expect(200);
    const response = await http()
      .post('/v1/auth/ba/sign-in/email-otp')
      .send({ email, otp: sentCodes.get(email) })
      .expect(200);
    const body = response.body as SignInBody;
    return { token: body.token, userId: body.user.id, headers: response.headers };
  }

  beforeAll(async () => {
    google = await createFakeGoogle();
    apple = await createFakeApple();
    serveJwks([google, apple]);
    app = await createApp(sentCodes);
    db = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('email codes (AUTH-03, BR-AUTH-03)', () => {
    it('sends a 6-digit code, signs in, and the API accepts the session as a bearer token', async () => {
      const email = `codigo-${nextSubject()}@example.test`;
      const signIn = await signInWithEmailCode(email);

      expect(sentCodes.get(email)).toMatch(/^\d{6}$/);
      expect(signIn.headers['set-auth-token']).toMatch(new RegExp(`^${signIn.token}\\.`));
      const me = await http()
        .get('/v1/spike/me')
        .set('Authorization', `Bearer ${signIn.token}`)
        .expect(200);
      const user = await db.user.findUniqueOrThrow({ where: { email } });
      expect((me.body as { userId: string }).userId).toBe(user.id);
      expect(user.emailVerified).toBe(true);
      expect(user.emailVerifiedAt).toBeNull();
    });

    it('stores the code hashed', async () => {
      const email = `hash-${nextSubject()}@example.test`;
      await http()
        .post('/v1/auth/ba/email-otp/send-verification-otp')
        .send({ email, type: 'sign-in' })
        .expect(200);

      const row = await db.baVerification.findFirstOrThrow({
        where: { identifier: { contains: email } },
      });
      expect(row.value).not.toContain(sentCodes.get(email));
    });

    it('tells a wrong code from an expired one, and locks the code after 5 attempts', async () => {
      const email = `intentos-${nextSubject()}@example.test`;
      await http()
        .post('/v1/auth/ba/email-otp/send-verification-otp')
        .send({ email, type: 'sign-in' })
        .expect(200);
      const wrong = sentCodes.get(email) === '000000' ? '111111' : '000000';

      const first = await http().post('/v1/auth/ba/sign-in/email-otp').send({ email, otp: wrong });
      expect(errorCode(first)).toBe('INVALID_OTP');
      for (let attempt = 2; attempt <= 5; attempt++) {
        await http().post('/v1/auth/ba/sign-in/email-otp').send({ email, otp: wrong });
      }
      const locked = await http()
        .post('/v1/auth/ba/sign-in/email-otp')
        .send({ email, otp: sentCodes.get(email) });
      expect(errorCode(locked)).toBe('TOO_MANY_ATTEMPTS');

      await http()
        .post('/v1/auth/ba/email-otp/send-verification-otp')
        .send({ email, type: 'sign-in' })
        .expect(200);
      await db.baVerification.updateMany({
        where: { identifier: { contains: email } },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const expired = await http()
        .post('/v1/auth/ba/sign-in/email-otp')
        .send({ email, otp: sentCodes.get(email) });
      expect(errorCode(expired)).toBe('OTP_EXPIRED');
    });

    it('GAP: limits code requests per IP and path, not per email (NFR-SEC-05 asks for 5 per email per hour)', async () => {
      const limited = await createApp(new Map(), true);
      const email = `limite-${nextSubject()}@example.test`;
      const statuses: number[] = [];
      for (let i = 1; i <= 8; i++) {
        const response = await request(limited.getHttpServer())
          .post('/v1/auth/ba/email-otp/send-verification-otp')
          .set('X-Forwarded-For', `203.0.113.${String(i)}`)
          .send({ email, type: 'sign-in' });
        statuses.push(response.status);
      }
      await limited.close();

      expect(statuses).toEqual(Array(8).fill(200));
    });
  });

  describe('native Google and Apple sign-in with ID tokens (AUTH-01, AUTH-02)', () => {
    it('creates the account from a Google ID token minted for the iOS client', async () => {
      const email = `google-${nextSubject()}@example.test`;
      const token = await google.sign(
        { sub: nextSubject(), email, email_verified: true, name: 'Nicolás Pérez' },
        { audience: GOOGLE_CLIENT_IDS.ios },
      );

      const response = await http()
        .post('/v1/auth/ba/sign-in/social')
        .send({ provider: 'google', idToken: { token } })
        .expect(200);

      expect((response.body as { redirect: boolean }).redirect).toBe(false);
      const user = await db.user.findUniqueOrThrow({
        where: { email },
        include: { baAccounts: true },
      });
      expect(user.name).toBe('Nicolás Pérez');
      expect(user.baAccounts).toHaveLength(1);
      expect(user.baAccounts[0]?.idToken).toBeNull();
    });

    it('signs into the existing account when the verified email matches (BR-AUTH-01)', async () => {
      const email = `vincular-${nextSubject()}@example.test`;
      const codeSignIn = await signInWithEmailCode(email);
      const token = await google.sign(
        { sub: nextSubject(), email, email_verified: true },
        { audience: GOOGLE_CLIENT_IDS.android },
      );

      const googleSignIn = await http()
        .post('/v1/auth/ba/sign-in/social')
        .send({ provider: 'google', idToken: { token } })
        .expect(200);

      expect((googleSignIn.body as SignInBody).user.id).toBe(codeSignIn.userId);
    });

    it('never links an unverified provider email to an existing account (BR-AUTH-01)', async () => {
      const email = `sin-verificar-${nextSubject()}@example.test`;
      await signInWithEmailCode(email);
      const token = await google.sign(
        { sub: nextSubject(), email, email_verified: false },
        { audience: GOOGLE_CLIENT_IDS.web },
      );

      const response = await http()
        .post('/v1/auth/ba/sign-in/social')
        .send({ provider: 'google', idToken: { token } });

      expect(response.status).toBeGreaterThanOrEqual(400);
      const accounts = await db.baAccount.count({
        where: { user: { email }, providerId: 'google' },
      });
      expect(accounts).toBe(0);
    });

    it('rejects a token minted for another app', async () => {
      const token = await google.sign(
        { sub: nextSubject(), email: `otra-${nextSubject()}@example.test`, email_verified: true },
        { audience: 'someone-else.apps.googleusercontent.com' },
      );

      await http()
        .post('/v1/auth/ba/sign-in/social')
        .send({ provider: 'google', idToken: { token } })
        .expect(401);
    });

    it('accepts an Apple ID token with a hashed nonce and a private relay email (BR-AUTH-02)', async () => {
      const rawNonce = 'nonce-from-the-app';
      const email = `${nextSubject()}@privaterelay.appleid.com`;
      const token = await apple.sign(
        {
          sub: nextSubject(),
          email,
          email_verified: 'true',
          is_private_email: 'true',
          nonce: sha256Hex(rawNonce),
        },
        { audience: APPLE_BUNDLE_ID },
      );

      await http()
        .post('/v1/auth/ba/sign-in/social')
        .send({ provider: 'apple', idToken: { token, nonce: rawNonce } })
        .expect(200);
      const wrongNonce = await apple.sign(
        { sub: nextSubject(), email, email_verified: 'true', nonce: sha256Hex('another') },
        { audience: APPLE_BUNDLE_ID },
      );
      await http()
        .post('/v1/auth/ba/sign-in/social')
        .send({ provider: 'apple', idToken: { token: wrongNonce, nonce: rawNonce } })
        .expect(401);
    });
  });

  describe('web cookie sessions', () => {
    it('sets an httpOnly, SameSite=Lax cookie that the API accepts', async () => {
      const email = `web-${nextSubject()}@example.test`;
      await http()
        .post('/v1/auth/ba/email-otp/send-verification-otp')
        .set('Origin', WEB_ORIGIN)
        .send({ email, type: 'sign-in' })
        .expect(200);
      const signIn = await http()
        .post('/v1/auth/ba/sign-in/email-otp')
        .set('Origin', WEB_ORIGIN)
        .send({ email, otp: sentCodes.get(email) })
        .expect(200);

      const setCookie = ([] as string[]).concat(signIn.headers['set-cookie'] ?? []);
      const sessionCookie = setCookie.find((cookie) =>
        cookie.startsWith('better-auth.session_token='),
      );
      expect(sessionCookie).toMatch(/HttpOnly/i);
      expect(sessionCookie).toMatch(/SameSite=Lax/i);
      const cookieHeader = sessionCookie?.split(';')[0] ?? '';
      await http().get('/v1/spike/me').set('Cookie', cookieHeader).expect(200);
    });

    it('rejects a cookie-authenticated sign-out from an untrusted origin (CSRF)', async () => {
      const email = `csrf-${nextSubject()}@example.test`;
      const signIn = await signInWithEmailCode(email);
      const cookieHeader =
        ([] as string[])
          .concat(signIn.headers['set-cookie'] ?? [])
          .find((cookie) => cookie.startsWith('better-auth.session_token='))
          ?.split(';')[0] ?? '';

      const response = await http()
        .post('/v1/auth/ba/sign-out')
        .set('Origin', 'https://evil.example')
        .set('Cookie', cookieHeader);

      expect(response.status).toBe(403);
    });
  });

  describe('sessions (BR-AUTH-04, NFR-SEC-11, AUTH-12)', () => {
    it('GAP: stores the session token in plain text, so a database read yields live sessions', async () => {
      const signIn = await signInWithEmailCode(`plano-${nextSubject()}@example.test`);

      const stored = await db.baSession.findFirstOrThrow({ where: { userId: signIn.userId } });
      expect(stored.token).toBe(signIn.token);
    });

    it('GAP: slides the expiry on use but never rotates the token, so there is nothing to detect reuse with', async () => {
      const signIn = await signInWithEmailCode(`rotacion-${nextSubject()}@example.test`);
      const token = signIn.token;
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      await db.baSession.update({
        where: { token },
        data: {
          expiresAt: new Date(twoDaysAgo.getTime() + 90 * 24 * 60 * 60 * 1000),
          updatedAt: twoDaysAgo,
        },
      });
      const before = await db.baSession.findUniqueOrThrow({ where: { token } });

      const refreshed = await http()
        .get('/v1/auth/ba/get-session')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const after = await db.baSession.findUniqueOrThrow({ where: { token } });
      expect(after.expiresAt.getTime()).toBeGreaterThan(before.expiresAt.getTime());
      expect(refreshed.headers['set-auth-token'] ?? token).toMatch(new RegExp(`^${token}(\\.|$)`));
      await http().get('/v1/spike/me').set('Authorization', `Bearer ${token}`).expect(200);
    });

    it('signs out every device on their next API call', async () => {
      const email = `todos-${nextSubject()}@example.test`;
      const phone = await signInWithEmailCode(email);
      const tablet = await signInWithEmailCode(email);

      await http()
        .post('/v1/auth/ba/revoke-sessions')
        .set('Authorization', `Bearer ${phone.token}`)
        .expect(200);

      await http().get('/v1/spike/me').set('Authorization', `Bearer ${tablet.token}`).expect(401);
      await http().get('/v1/spike/me').set('Authorization', `Bearer ${phone.token}`).expect(401);
    });
  });
});
