import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import type { PrismaClient } from '../../../src/generated/prisma/client.js';
import { AuthError } from './auth-error.js';

// BR-AUTH-03 and NFR-SEC-05.
const CODE_TTL_MS = 10 * 60_000;
const RESEND_AFTER_MS = 60_000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_HOUR = 5;
const HOUR_MS = 60 * 60_000;

export class EmailCodes {
  constructor(
    private readonly db: PrismaClient,
    private readonly pepper: string,
  ) {}

  async start(email: string, now: Date): Promise<string> {
    const recent = await this.db.emailCode.findMany({
      where: { email, createdAt: { gt: new Date(now.getTime() - HOUR_MS) } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const latest = recent[0];
    if (latest && now.getTime() - latest.createdAt.getTime() < RESEND_AFTER_MS) {
      throw new AuthError('CODE_RESEND_TOO_SOON');
    }
    if (recent.length >= MAX_CODES_PER_HOUR) throw new AuthError('CODE_RATE_LIMITED');

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.db.emailCode.create({
      data: {
        email,
        codeHash: this.hash(email, code),
        expiresAt: new Date(now.getTime() + CODE_TTL_MS),
        createdAt: now,
      },
    });
    return code;
  }

  async verify(email: string, code: string, now: Date): Promise<void> {
    const row = await this.db.emailCode.findFirst({
      where: { email, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) throw new AuthError('CODE_INVALID');
    if (row.expiresAt <= now) throw new AuthError('CODE_EXPIRED');

    const attempt = await this.db.emailCode.updateMany({
      where: { id: row.id, attempts: { lt: MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (attempt.count === 0) throw new AuthError('CODE_TOO_MANY_ATTEMPTS');
    if (!timingSafeEqual(Buffer.from(this.hash(email, code)), Buffer.from(row.codeHash))) {
      throw new AuthError('CODE_INVALID');
    }

    const consumed = await this.db.emailCode.updateMany({
      where: { id: row.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count === 0) throw new AuthError('CODE_INVALID');
  }

  // A 6-digit code has a million values, so a plain hash falls to brute force; the server-side pepper prevents that.
  private hash(email: string, code: string): string {
    return createHmac('sha256', this.pepper)
      .update(`${email.toLowerCase()}:${code}`)
      .digest('base64url');
  }
}
