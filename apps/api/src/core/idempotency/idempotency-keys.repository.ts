import { Injectable } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { type Claim, decideClaim } from './claim.js';

const toJsonColumn = (body: unknown) =>
  body === undefined || body === null
    ? Prisma.DbNull
    : (JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue);

@Injectable()
export class IdempotencyKeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO(TECH-13): purge rows whose started_at is older than KEY_RETENTION_MS.
  claim(userId: string, key: string, requestHash: string, now: Date): Promise<Claim> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`${userId}:${key}`}))`;
      const where = { userId_key: { userId, key } };
      const stored = await tx.idempotencyKey.findUnique({
        where,
        select: { requestHash: true, startedAt: true, responseStatus: true, responseBody: true },
      });

      const claim = decideClaim(stored, requestHash, now);
      if (claim.outcome === 'proceed') {
        const attempt = {
          requestHash,
          startedAt: now,
          responseStatus: null,
          responseBody: Prisma.DbNull,
        };
        await tx.idempotencyKey.upsert({
          where,
          create: { userId, key, ...attempt },
          update: attempt,
        });
      }
      return claim;
    });
  }

  async complete(userId: string, key: string, status: number, body: unknown): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { userId_key: { userId, key } },
      data: { responseStatus: status, responseBody: toJsonColumn(body) },
    });
  }

  async release(userId: string, key: string): Promise<void> {
    await this.prisma.idempotencyKey.deleteMany({ where: { userId, key, responseStatus: null } });
  }
}
