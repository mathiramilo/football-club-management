import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { type CryptoKey, jwtVerify, SignJWT } from 'jose';

import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { AuthError } from './auth-error.js';

export type Platform = 'ios' | 'android' | 'web';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const ISSUER = 'football-club-management';
const DAY_MS = 24 * 60 * 60_000;
// BR-AUTH-04: refresh tokens expire after 90 days without use on mobile, 30 on web.
const IDLE_TTL_MS: Record<Platform, number> = {
  ios: 90 * DAY_MS,
  android: 90 * DAY_MS,
  web: 30 * DAY_MS,
};

export interface SigningKeys {
  kid: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  familyId: string;
}

export interface AccessClaims {
  userId: string;
  familyId: string;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('base64url');
const newRefreshToken = () => randomBytes(32).toString('base64url');

type RotationResult =
  | { kind: 'rotated'; userId: string; familyId: string; refreshToken: string }
  | { kind: 'reused'; familyId: string }
  | { kind: 'invalid' }
  | { kind: 'expired' };

export class SessionTokens {
  constructor(
    private readonly db: PrismaClient,
    private readonly keys: SigningKeys,
  ) {}

  async issue(userId: string, platform: Platform, now: Date): Promise<TokenPair> {
    const familyId = randomUUID();
    const refreshToken = newRefreshToken();
    await this.db.refreshToken.create({
      data: {
        userId,
        familyId,
        platform,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(now.getTime() + IDLE_TTL_MS[platform]),
        createdAt: now,
      },
    });
    return { accessToken: await this.signAccess(userId, familyId, now), refreshToken, familyId };
  }

  async refresh(refreshToken: string, now: Date): Promise<TokenPair> {
    const result = await this.rotate(hashToken(refreshToken), now);
    if (result.kind === 'reused') {
      await this.revokeFamily(result.familyId, now);
      throw new AuthError('REFRESH_TOKEN_REUSED');
    }
    if (result.kind === 'expired') throw new AuthError('REFRESH_TOKEN_EXPIRED');
    if (result.kind === 'invalid') throw new AuthError('REFRESH_TOKEN_INVALID');
    return {
      accessToken: await this.signAccess(result.userId, result.familyId, now),
      refreshToken: result.refreshToken,
      familyId: result.familyId,
    };
  }

  async verifyAccess(
    accessToken: string,
    now: Date,
    options: { checkRevoked: boolean },
  ): Promise<AccessClaims> {
    const { payload } = await jwtVerify(accessToken, this.keys.publicKey, {
      currentDate: now,
      issuer: ISSUER,
      audience: ISSUER,
      algorithms: ['EdDSA'],
      requiredClaims: ['sub', 'sid', 'exp'],
    }).catch(() => {
      throw new AuthError('ACCESS_TOKEN_INVALID');
    });
    const claims = { userId: String(payload.sub), familyId: String(payload.sid) };
    if (options.checkRevoked) {
      const live = await this.db.refreshToken.findFirst({
        where: { familyId: claims.familyId, revokedAt: null },
        select: { id: true },
      });
      if (!live) throw new AuthError('SESSION_REVOKED');
    }
    return claims;
  }

  async revokeFamily(familyId: string, now: Date): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async revokeAll(userId: string, now: Date): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  private rotate(tokenHash: string, now: Date): Promise<RotationResult> {
    return this.db.$transaction(async (tx): Promise<RotationResult> => {
      const current = await tx.refreshToken.findUnique({ where: { tokenHash } });
      if (!current) return { kind: 'invalid' };
      if (current.revokedAt) {
        return current.replacedById
          ? { kind: 'reused', familyId: current.familyId }
          : { kind: 'invalid' };
      }
      if (current.expiresAt <= now) return { kind: 'expired' };

      const claimed = await tx.refreshToken.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: now, lastUsedAt: now },
      });
      if (claimed.count === 0) return { kind: 'reused', familyId: current.familyId };

      const refreshToken = newRefreshToken();
      const next = await tx.refreshToken.create({
        data: {
          userId: current.userId,
          familyId: current.familyId,
          platform: current.platform,
          tokenHash: hashToken(refreshToken),
          expiresAt: new Date(now.getTime() + IDLE_TTL_MS[current.platform as Platform]),
          createdAt: now,
        },
      });
      await tx.refreshToken.update({ where: { id: current.id }, data: { replacedById: next.id } });
      return { kind: 'rotated', userId: current.userId, familyId: current.familyId, refreshToken };
    });
  }

  private signAccess(userId: string, familyId: string, now: Date): Promise<string> {
    return new SignJWT({ sid: familyId })
      .setProtectedHeader({ alg: 'EdDSA', kid: this.keys.kid })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(ISSUER)
      .setIssuedAt(now)
      .setExpirationTime(Math.floor(now.getTime() / 1000) + ACCESS_TOKEN_TTL_SECONDS)
      .sign(this.keys.privateKey);
  }
}
