import { createHash } from 'node:crypto';

import { createRemoteJWKSet, jwtVerify } from 'jose';

import { AuthError } from './auth-error.js';

export type IdTokenProviderName = 'google' | 'apple';

export interface IdTokenProvider {
  name: IdTokenProviderName;
  issuers: string[];
  jwksUrl: string;
  audiences: string[];
}

export interface VerifiedIdentity {
  provider: IdTokenProviderName;
  subject: string;
  email: string;
  emailVerified: boolean;
}

export const googleProvider = (audiences: string[]): IdTokenProvider => ({
  name: 'google',
  issuers: ['https://accounts.google.com', 'accounts.google.com'],
  jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
  audiences,
});

export const appleProvider = (audiences: string[]): IdTokenProvider => ({
  name: 'apple',
  issuers: ['https://appleid.apple.com'],
  jwksUrl: 'https://appleid.apple.com/auth/keys',
  audiences,
});

const sha256Hex = (value: string) => createHash('sha256').update(value).digest('hex');

// Apple sends `email_verified` as the string "true" in some token versions.
const isTrue = (claim: unknown) => claim === true || claim === 'true';

export function createIdTokenVerifier(provider: IdTokenProvider) {
  const jwks = createRemoteJWKSet(new URL(provider.jwksUrl));

  return async (token: string, nonce?: string): Promise<VerifiedIdentity> => {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: provider.issuers,
      audience: provider.audiences,
      algorithms: ['RS256'],
      requiredClaims: ['sub', 'email', 'iat', 'exp'],
      maxTokenAge: '1h',
      clockTolerance: 30,
    }).catch(() => {
      throw new AuthError('ID_TOKEN_INVALID');
    });
    // The native SDKs hand Apple the SHA-256 of the nonce; Google echoes it as given.
    if (nonce !== undefined && payload.nonce !== nonce && payload.nonce !== sha256Hex(nonce)) {
      throw new AuthError('ID_TOKEN_INVALID');
    }
    return {
      provider: provider.name,
      subject: String(payload.sub),
      email: String(payload.email),
      emailVerified: isTrue(payload.email_verified),
    };
  };
}
