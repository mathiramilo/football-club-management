import { createHash, randomUUID } from 'node:crypto';

import { Controller, Get, Module } from '@nestjs/common';
import { exportJWK, generateKeyPair, type JWK, type JWTPayload, SignJWT } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { vi } from 'vitest';

import { type Actor, CurrentActor } from '../../src/core/auth/actor.js';
import { Can, Policies } from '../../src/core/authorization/policy.js';
import { EmailSender, type EmailMessage } from '../../src/core/email/email-sender.js';
import { SIGNED_IN_TEST_ACTION, signedInTestPolicies } from './test-policies.js';

export const TEST_WEB_ORIGIN = 'http://localhost:3000';
export const TEST_GOOGLE_CLIENT_IDS = {
  web: 'test-web.apps.googleusercontent.com',
  ios: 'test-ios.apps.googleusercontent.com',
  android: 'test-android.apps.googleusercontent.com',
};
export const TEST_APPLE_CLIENT_IDS = { bundle: 'uy.clubapp.test', services: 'uy.clubapp.test.web' };

export const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}@example.test`;
export const uniqueSubject = () => randomUUID();
export const sha256Hex = (value: string) => createHash('sha256').update(value).digest('hex');

export class FakeEmailSender extends EmailSender {
  readonly sent: EmailMessage[] = [];

  send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }

  lastCodeFor(email: string): string {
    const message = this.sent.findLast((candidate) => candidate.to === email);
    const code = message && /\b(\d{6})\b/.exec(message.text)?.[1];
    if (!code) throw new Error(`No sign-in code was sent to ${email}`);
    return code;
  }
}

export interface FakeIdentityProvider {
  sign(claims: JWTPayload, options: { audience: string; issuer?: string }): Promise<string>;
}

async function createFakeIdentityProvider(issuer: string, jwksUrl: string, kid: string) {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwks: { keys: JWK[] } = {
    keys: [{ ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' }],
  };
  const provider: FakeIdentityProvider = {
    sign: (claims, options) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid })
        .setIssuer(options.issuer ?? issuer)
        .setAudience(options.audience)
        .setIssuedAt()
        .setExpirationTime('10m')
        .sign(privateKey),
  };
  return { provider, jwksUrl, jwks };
}

// Serves the fake providers' keys at Google's and Apple's real JWKS URLs, so Better Auth's own verification runs.
export async function fakeGoogleAndApple(): Promise<{
  google: FakeIdentityProvider;
  apple: FakeIdentityProvider;
}> {
  const google = await createFakeIdentityProvider(
    'https://accounts.google.com',
    'https://www.googleapis.com/oauth2/v3/certs',
    'google-test',
  );
  const apple = await createFakeIdentityProvider(
    'https://appleid.apple.com',
    'https://appleid.apple.com/auth/keys',
    'apple-test',
  );
  const realFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const match = [google, apple].find((candidate) => candidate.jwksUrl === url);
    return match ? Promise.resolve(Response.json(match.jwks)) : realFetch(input, init);
  });
  return { google: google.provider, apple: apple.provider };
}

@Policies(signedInTestPolicies)
@Controller('test/whoami')
class WhoAmIController {
  @Can(SIGNED_IN_TEST_ACTION)
  @Get()
  whoAmI(@CurrentActor() actor: Actor) {
    return actor;
  }
}

@Module({ controllers: [WhoAmIController] })
export class WhoAmIModule {}

export interface SignedIn {
  token: string;
  userId: string;
  cookie: string;
}

export async function signInWithEmailCode(
  app: { getHttpServer(): App },
  email: FakeEmailSender,
  address: string,
  origin?: string,
): Promise<SignedIn> {
  const http = () => request(app.getHttpServer());
  const withOrigin = (test: request.Test) => (origin ? test.set('Origin', origin) : test);
  await withOrigin(http().post('/v1/auth/email-otp/send-verification-otp'))
    .send({ email: address, type: 'sign-in' })
    .expect(200);
  const response = await withOrigin(http().post('/v1/auth/sign-in/email-otp'))
    .send({ email: address, otp: email.lastCodeFor(address) })
    .expect(200);
  const body = response.body as { token: string; user: { id: string } };
  const cookies = ([] as string[]).concat(response.headers['set-cookie'] ?? []);
  return {
    token: body.token,
    userId: body.user.id,
    cookie: cookies.find((cookie) => cookie.startsWith('better-auth.session_token=')) ?? '',
  };
}
