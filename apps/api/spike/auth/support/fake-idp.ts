import { createHash } from 'node:crypto';

import { exportJWK, generateKeyPair, type JWK, type JWTPayload, SignJWT } from 'jose';
import { vi } from 'vitest';

export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
export const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

export const GOOGLE_CLIENT_IDS = {
  ios: 'spike-ios.apps.googleusercontent.com',
  android: 'spike-android.apps.googleusercontent.com',
  web: 'spike-web.apps.googleusercontent.com',
};
export const APPLE_BUNDLE_ID = 'uy.clubapp.spike';
export const APPLE_SERVICE_ID = 'uy.clubapp.spike.web';

export interface FakeIdp {
  jwksUrl: string;
  jwks: { keys: JWK[] };
  sign(
    claims: JWTPayload,
    options: { audience: string; issuer?: string; expiresIn?: string },
  ): Promise<string>;
}

async function createFakeIdp(issuer: string, jwksUrl: string, kid: string): Promise<FakeIdp> {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' };
  return {
    jwksUrl,
    jwks: { keys: [jwk] },
    sign: (claims, options) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid })
        .setIssuer(options.issuer ?? issuer)
        .setAudience(options.audience)
        .setIssuedAt()
        .setExpirationTime(options.expiresIn ?? '10m')
        .sign(privateKey),
  };
}

export const createFakeGoogle = () =>
  createFakeIdp('https://accounts.google.com', GOOGLE_JWKS_URL, 'google-1');
export const createFakeApple = () =>
  createFakeIdp('https://appleid.apple.com', APPLE_JWKS_URL, 'apple-1');

export function serveJwks(idps: FakeIdp[]): void {
  const realFetch = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const idp = idps.find((candidate) => candidate.jwksUrl === url);
    return idp ? Response.json(idp.jwks) : realFetch(input, init);
  });
}

export const sha256Hex = (value: string) => createHash('sha256').update(value).digest('hex');

let subjectCounter = 0;
export const nextSubject = () => `${String(Date.now())}${String(++subjectCounter)}`;
