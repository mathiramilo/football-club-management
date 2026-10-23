import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { decideEmailCodeRequest, type EmailCodeDecision, HOUR_MS } from './email-code-limit.js';

@Injectable()
export class EmailCodeRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO(TECH-13): purge rows older than an hour for emails that never request another code.
  reserve(emailHash: string, now: Date): Promise<EmailCodeDecision> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${emailHash}))`;
      await tx.emailCodeRequest.deleteMany({
        where: { emailHash, requestedAt: { lte: new Date(now.getTime() - HOUR_MS) } },
      });
      const previous = await tx.emailCodeRequest.findMany({
        where: { emailHash },
        select: { requestedAt: true },
      });

      const decision = decideEmailCodeRequest(
        previous.map((request) => request.requestedAt),
        now,
      );
      if (decision.allowed) {
        await tx.emailCodeRequest.create({ data: { emailHash, requestedAt: now } });
      }
      return decision;
    });
  }
}
