import { createPrivateKey, sign } from 'node:crypto';

export interface AppleSigningKey {
  teamId: string;
  keyId: string;
  privateKey: string;
}

const APPLE_AUDIENCE = 'https://appleid.apple.com';
const LIFETIME_SECONDS = 5 * 60;

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

// Apple takes a client secret that is a JWT signed with the team's key and valid for at most
// six months, so a short-lived one is signed whenever Better Auth reads it instead of rotating one.
export function signAppleClientSecret(key: AppleSigningKey, clientId: string, now: Date): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const unsigned = [
    encode({ alg: 'ES256', kid: key.keyId }),
    encode({
      iss: key.teamId,
      sub: clientId,
      aud: APPLE_AUDIENCE,
      iat: issuedAt,
      exp: issuedAt + LIFETIME_SECONDS,
    }),
  ].join('.');
  const signature = sign('sha256', Buffer.from(unsigned), {
    key: createPrivateKey(key.privateKey),
    dsaEncoding: 'ieee-p1363',
  });
  return `${unsigned}.${signature.toString('base64url')}`;
}
