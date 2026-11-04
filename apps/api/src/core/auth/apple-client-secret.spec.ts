import { generateKeyPairSync } from 'node:crypto';

import { decodeProtectedHeader, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';

import { signAppleClientSecret } from './apple-client-secret.js';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const key = {
  teamId: 'TEAM123456',
  keyId: 'KEY1234567',
  privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
};
const now = new Date('2026-10-29T12:00:00Z');

describe('signAppleClientSecret', () => {
  it('signs an ES256 token for the services ID with the team key', async () => {
    const secret = signAppleClientSecret(key, 'uy.clubapp.web', now);

    expect(decodeProtectedHeader(secret)).toEqual({ alg: 'ES256', kid: 'KEY1234567' });
    const { payload } = await jwtVerify(secret, publicKey, {
      issuer: 'TEAM123456',
      subject: 'uy.clubapp.web',
      audience: 'https://appleid.apple.com',
      currentDate: now,
    });
    expect(payload).toMatchObject({ iat: now.getTime() / 1000, exp: now.getTime() / 1000 + 300 });
  });

  it('expires five minutes after it is signed', async () => {
    const secret = signAppleClientSecret(key, 'uy.clubapp.web', now);

    await expect(
      jwtVerify(secret, publicKey, { currentDate: new Date(now.getTime() + 301_000) }),
    ).rejects.toThrow('"exp" claim timestamp check failed');
  });
});
