import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { EmailSender } from '../../src/core/email/email-sender.js';
import {
  FakeEmailSender,
  signInWithEmailCode,
  TEST_WEB_ORIGIN,
  uniqueEmail,
  WhoAmIModule,
} from '../support/auth-fixtures.js';
import { createTestApp } from '../support/create-test-app.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('Sessions and the auth guard (BR-AUTH-04, NFR-SEC-11, AUTH-12)', () => {
  const email = new FakeEmailSender();
  let app: INestApplication<App>;
  let db: PrismaService;

  const http = () => request(app.getHttpServer());
  const whoAmI = (token: string) =>
    http().get('/v1/test/whoami').set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    app = await createTestApp(
      (builder) => builder.overrideProvider(EmailSender).useValue(email),
      [WhoAmIModule],
    );
    db = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects requests without a valid session', async () => {
    await http().get('/v1/test/whoami').expect(401);
    await whoAmI('not-a-session-token').expect(401);
  });

  it('leaves public routes open', async () => {
    await http().get('/health').expect(200);
  });

  it('accepts the web session cookie, which is httpOnly and SameSite=Lax', async () => {
    const signedIn = await signInWithEmailCode(app, email, uniqueEmail('web'), TEST_WEB_ORIGIN);

    expect(signedIn.cookie).toMatch(/HttpOnly/i);
    expect(signedIn.cookie).toMatch(/SameSite=Lax/i);
    const cookie = signedIn.cookie.split(';')[0] ?? '';
    const response = await http().get('/v1/test/whoami').set('Cookie', cookie).expect(200);
    expect(response.body).toMatchObject({ userId: signedIn.userId });
  });

  it('rejects a cookie request from an untrusted origin (CSRF)', async () => {
    const signedIn = await signInWithEmailCode(app, email, uniqueEmail('csrf'), TEST_WEB_ORIGIN);

    await http()
      .post('/v1/auth/sign-out')
      .set('Origin', 'https://evil.example')
      .set('Cookie', signedIn.cookie.split(';')[0] ?? '')
      .expect(403);
  });

  it('expires after 90 days without use (BR-AUTH-04)', async () => {
    const before = Date.now();
    const signedIn = await signInWithEmailCode(app, email, uniqueEmail('vence'));

    const session = await db.authSession.findUniqueOrThrow({ where: { token: signedIn.token } });
    expect(session.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 90 * DAY_MS - 60_000);
    expect(session.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 90 * DAY_MS);

    await db.authSession.update({
      where: { token: signedIn.token },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    await whoAmI(signedIn.token).expect(401);
  });

  it('slides the session and the web cookie forward on use (BR-AUTH-04)', async () => {
    const signedIn = await signInWithEmailCode(app, email, uniqueEmail('desliza'), TEST_WEB_ORIGIN);
    const twoDaysAgo = new Date(Date.now() - 2 * DAY_MS);
    await db.authSession.update({
      where: { token: signedIn.token },
      data: { updatedAt: twoDaysAgo, expiresAt: new Date(twoDaysAgo.getTime() + 90 * DAY_MS) },
    });

    const response = await http()
      .get('/v1/test/whoami')
      .set('Cookie', signedIn.cookie.split(';')[0] ?? '')
      .expect(200);

    const session = await db.authSession.findUniqueOrThrow({ where: { token: signedIn.token } });
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now() + 89 * DAY_MS);
    const refreshed = ([] as string[]).concat(response.headers['set-cookie'] ?? []);
    expect(refreshed.some((cookie) => cookie.startsWith('better-auth.session_token='))).toBe(true);
  });

  it('signs out this device only (AUTH-12)', async () => {
    const address = uniqueEmail('salir');
    const phone = await signInWithEmailCode(app, email, address);
    const tablet = await signInWithEmailCode(app, email, address);

    await http()
      .post('/v1/auth/sign-out')
      .set('Authorization', `Bearer ${phone.token}`)
      .expect(200);

    await whoAmI(phone.token).expect(401);
    await whoAmI(tablet.token).expect(200);
  });

  it('signs out every device on their next request (AUTH-12)', async () => {
    const address = uniqueEmail('todos');
    const phone = await signInWithEmailCode(app, email, address);
    const tablet = await signInWithEmailCode(app, email, address);

    await http()
      .post('/v1/auth/revoke-sessions')
      .set('Authorization', `Bearer ${phone.token}`)
      .expect(200);

    await whoAmI(phone.token).expect(401);
    await whoAmI(tablet.token).expect(401);
  });

  it('turns off the Better Auth routes we do not use', async () => {
    const signedIn = await signInWithEmailCode(app, email, uniqueEmail('rutas'));

    await http()
      .post('/v1/auth/update-user')
      .set('Authorization', `Bearer ${signedIn.token}`)
      .send({ name: 'Otro nombre' })
      .expect(404);
  });
});
