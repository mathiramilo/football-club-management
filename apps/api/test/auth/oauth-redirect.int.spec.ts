import type { INestApplication } from '@nestjs/common';
import { decodeProtectedHeader, jwtVerify } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import {
  type FakeIdentityProvider,
  fakeGoogleAndApple,
  TEST_APPLE_CLIENT_IDS,
  TEST_APPLE_SIGNING_KEY,
  TEST_GOOGLE_CLIENT_IDS,
  TEST_GOOGLE_CLIENT_SECRET,
  TEST_WEB_ORIGIN,
  uniqueEmail,
  uniqueSubject,
  WhoAmIModule,
} from '../support/auth-fixtures.js';
import { createTestApp } from '../support/create-test-app.js';

const TOKEN_URLS = {
  google: 'https://oauth2.googleapis.com/token',
  apple: 'https://appleid.apple.com/auth/token',
};
const API_ORIGIN = 'http://localhost:3001';
const CALLBACK_URL = `${TEST_WEB_ORIGIN}/inicio`;
const ERROR_URL = `${TEST_WEB_ORIGIN}/ingresar`;

interface SocialSignInBody {
  url: string;
  redirect: boolean;
}

const cookiesOf = (response: request.Response) =>
  ([] as string[]).concat(response.headers['set-cookie'] ?? []);
const cookieHeader = (cookies: string[]) =>
  cookies.map((cookie) => cookie.split(';')[0]).join('; ');
const formBody = (body: RequestInit['body']) =>
  new URLSearchParams(body instanceof URLSearchParams || typeof body === 'string' ? body : '');

describe('Web sign-in with Google and Apple through the redirect flow (AUTH-01, AUTH-02, TECH-09)', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  let google: FakeIdentityProvider;
  let apple: FakeIdentityProvider;
  let nextIdToken = '';
  const tokenRequests: { url: string; body: URLSearchParams }[] = [];

  const http = () => request(app.getHttpServer());
  const startSignIn = (provider: 'google' | 'apple', callbackURL = CALLBACK_URL) =>
    http()
      .post('/v1/auth/sign-in/social')
      .set('Origin', TEST_WEB_ORIGIN)
      .send({ provider, callbackURL, errorCallbackURL: ERROR_URL });

  async function redirectToProvider(provider: 'google' | 'apple') {
    const response = await startSignIn(provider).expect(200);
    const body = response.body as SocialSignInBody;
    return { url: new URL(body.url), cookies: cookiesOf(response) };
  }

  beforeAll(async () => {
    ({ google, apple } = await fakeGoogleAndApple());
    const jwksFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!Object.values(TOKEN_URLS).includes(url)) return jwksFetch(input, init);
      tokenRequests.push({ url, body: formBody(init?.body) });
      return Promise.resolve(
        Response.json({
          access_token: 'provider-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          id_token: nextIdToken,
        }),
      );
    });
    app = await createTestApp(undefined, [WhoAmIModule]);
    db = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it('sends the browser to Google with the web client and PKCE', async () => {
    const { url } = await redirectToProvider('google');

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: TEST_GOOGLE_CLIENT_IDS.web,
      redirect_uri: `${API_ORIGIN}/v1/auth/callback/google`,
      response_type: 'code',
      code_challenge_method: 'S256',
    });
    expect(url.searchParams.get('state')).toBeTruthy();
  });

  it('refuses to send the user back to a site outside the web origins', async () => {
    await startSignIn('google', 'https://evil.example/inicio').expect(403);
  });

  it('signs in with Google and returns to the web app with the session cookie', async () => {
    const address = uniqueEmail('google-web');
    const { url, cookies } = await redirectToProvider('google');
    nextIdToken = await google.sign(
      { sub: uniqueSubject(), email: address, email_verified: true, name: 'Nicolás Pérez' },
      { audience: TEST_GOOGLE_CLIENT_IDS.web },
    );

    const callback = await http()
      .get('/v1/auth/callback/google')
      .query({ code: 'google-code', state: url.searchParams.get('state') })
      .set('Cookie', cookieHeader(cookies))
      .expect(302);

    expect(callback.headers.location).toBe(CALLBACK_URL);
    const session = cookiesOf(callback).find((cookie) =>
      cookie.startsWith('better-auth.session_token='),
    );
    expect(session).toMatch(/HttpOnly/i);
    const user = await db.user.findUniqueOrThrow({ where: { email: address } });
    const whoAmI = await http()
      .get('/v1/test/whoami')
      .set('Cookie', cookieHeader([session ?? '']))
      .expect(200);
    expect(whoAmI.body).toMatchObject({ userId: user.id });
    expect(Object.fromEntries(tokenRequests.at(-1)?.body ?? [])).toMatchObject({
      client_id: TEST_GOOGLE_CLIENT_IDS.web,
      client_secret: TEST_GOOGLE_CLIENT_SECRET,
      code: 'google-code',
    });
  });

  it('sends the browser to Apple with the services ID and a form post back', async () => {
    const { url } = await redirectToProvider('apple');

    expect(url.origin + url.pathname).toBe('https://appleid.apple.com/auth/authorize');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: TEST_APPLE_CLIENT_IDS.services,
      redirect_uri: `${API_ORIGIN}/v1/auth/callback/apple`,
      response_mode: 'form_post',
    });
  });

  it('signs in with Apple, keeps the name it sends once, and signs a fresh client secret (BR-AUTH-02)', async () => {
    const address = `${uniqueSubject()}@privaterelay.appleid.com`;
    const { url, cookies } = await redirectToProvider('apple');
    nextIdToken = await apple.sign(
      { sub: uniqueSubject(), email: address, email_verified: 'true', is_private_email: 'true' },
      { audience: TEST_APPLE_CLIENT_IDS.services },
    );

    const formPost = await http()
      .post('/v1/auth/callback/apple')
      .type('form')
      .send({
        code: 'apple-code',
        state: url.searchParams.get('state'),
        user: JSON.stringify({ name: { firstName: 'Lucía', lastName: 'Prueba' } }),
      })
      .expect(302);
    const redirect = new URL(formPost.headers.location ?? '');
    const callback = await http()
      .get(redirect.pathname + redirect.search)
      .set('Cookie', cookieHeader(cookies))
      .expect(302);

    expect(callback.headers.location).toBe(CALLBACK_URL);
    const user = await db.user.findUniqueOrThrow({ where: { email: address } });
    expect(user.name).toBe('Lucía Prueba');
    const clientSecret = tokenRequests.at(-1)?.body.get('client_secret') ?? '';
    expect(decodeProtectedHeader(clientSecret)).toMatchObject({
      alg: 'ES256',
      kid: TEST_APPLE_SIGNING_KEY.keyId,
    });
    await jwtVerify(clientSecret, TEST_APPLE_SIGNING_KEY.publicKey, {
      issuer: TEST_APPLE_SIGNING_KEY.teamId,
      subject: TEST_APPLE_CLIENT_IDS.services,
      audience: 'https://appleid.apple.com',
    });
  });
});
