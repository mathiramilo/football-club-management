import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { EmailSender } from '../../src/core/email/email-sender.js';
import {
  FakeEmailSender,
  signInWithEmailCode,
  TEST_WEB_ORIGIN,
  uniqueEmail,
  WhoAmIModule,
} from '../support/auth-fixtures.js';
import { createTestApp } from '../support/create-test-app.js';

const OTHER_ORIGIN = 'https://evil.example';

describe('Web sessions across origins (TECH-09, ADR-007)', () => {
  const email = new FakeEmailSender();
  let app: INestApplication<App>;

  const http = () => request(app.getHttpServer());
  const preflight = (path: string, origin: string) =>
    http()
      .options(path)
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-app-version,x-platform');
  const sessionCookie = async () =>
    (await signInWithEmailCode(app, email, uniqueEmail('web'), TEST_WEB_ORIGIN)).cookie.split(
      ';',
    )[0] ?? '';

  beforeAll(async () => {
    app = await createTestApp(
      (builder) => builder.overrideProvider(EmailSender).useValue(email),
      [WhoAmIModule],
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['/v1/app-config', '/v1/test/whoami', '/v1/auth/sign-in/email-otp'])(
    'answers a preflight from the web app with credentials allowed (%s)',
    async (path) => {
      const response = await preflight(path, TEST_WEB_ORIGIN).expect(204);

      expect(response.headers).toMatchObject({
        'access-control-allow-origin': TEST_WEB_ORIGIN,
        'access-control-allow-credentials': 'true',
      });
      expect(response.headers['access-control-allow-headers']).toContain('x-app-version');
    },
  );

  it('gives any other origin no CORS access', async () => {
    const response = await preflight('/v1/test/whoami', OTHER_ORIGIN);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('lets the web app read a response sent with its cookie', async () => {
    const cookie = await sessionCookie();

    const response = await http()
      .get('/v1/test/whoami')
      .set('Origin', TEST_WEB_ORIGIN)
      .set('Cookie', cookie)
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe(TEST_WEB_ORIGIN);
  });

  it('accepts a cookie write from the web app', async () => {
    const cookie = await sessionCookie();

    await http()
      .post('/v1/test/whoami')
      .set('Origin', TEST_WEB_ORIGIN)
      .set('Cookie', cookie)
      .expect(200);
  });

  it.each([
    { case: 'another origin', origin: OTHER_ORIGIN },
    { case: 'no origin', origin: undefined },
  ])('rejects a cookie write from $case (CSRF)', async ({ origin }) => {
    const cookie = await sessionCookie();
    const write = http().post('/v1/test/whoami').set('Cookie', cookie);

    const response = await (origin ? write.set('Origin', origin) : write).expect(403);

    expect(response.body).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('accepts a bearer write without an origin, as the app sends it', async () => {
    const { token } = await signInWithEmailCode(app, email, uniqueEmail('app'));

    await http().post('/v1/test/whoami').set('Authorization', `Bearer ${token}`).expect(200);
  });
});
