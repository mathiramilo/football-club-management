import {
  type BeforeApplicationShutdown,
  Injectable,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { fromPrisma, PgBoss } from 'pg-boss';

import type { Prisma } from '../../generated/prisma/client.js';
import { Clock } from '../clock/clock.js';
import { PrismaService } from '../database/prisma.service.js';
import { nameOf } from '../errors/redacted-error.js';
import { JobAlerts } from '../jobs/job-alerts.js';

export const RELAY_BATCH_SIZE = 100;

const RELAY_INTERVAL_MS = 1_000;

interface PendingEvent {
  id: string;
  type: string;
  payload: Prisma.JsonObject;
}

@Injectable()
export class OutboxRelay {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boss: PgBoss,
    private readonly clock: Clock,
    private readonly alerts: JobAlerts,
  ) {}

  async relayPending(): Promise<number> {
    let claimed: string[] = [];
    try {
      return await this.prisma.$transaction(async (tx) => {
        const events = await tx.$queryRaw<PendingEvent[]>`
          SELECT id, type, payload FROM outbox_events
          WHERE processed_at IS NULL
          ORDER BY created_at
          LIMIT ${RELAY_BATCH_SIZE}
          FOR UPDATE SKIP LOCKED`;
        if (events.length === 0) return 0;

        claimed = events.map(({ id }) => id);
        const db = fromPrisma(tx);
        for (const { id, type, payload } of events) {
          await this.boss.publish(type, { ...payload, outboxEventId: id }, { db });
        }
        const now = this.clock.now();
        await tx.outboxEvent.updateMany({
          where: { id: { in: claimed } },
          data: { processedAt: now, updatedAt: now },
        });
        return events.length;
      });
    } catch (error) {
      this.alerts.queueFailed(error);
      if (claimed.length > 0) {
        await this.prisma.outboxEvent.updateMany({
          where: { id: { in: claimed } },
          data: {
            attempts: { increment: 1 },
            lastError: nameOf(error),
            updatedAt: this.clock.now(),
          },
        });
      }
      return 0;
    }
  }
}

@Injectable()
export class OutboxRelayLoop implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private timer: NodeJS.Timeout | undefined;
  private running: Promise<void> = Promise.resolve();
  private stopped = false;

  constructor(
    private readonly relay: OutboxRelay,
    private readonly alerts: JobAlerts,
  ) {}

  onApplicationBootstrap(): void {
    this.next();
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.running;
  }

  private next(): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.running = this.drain()
        .catch((error: unknown) => {
          this.alerts.queueFailed(error);
        })
        .finally(() => {
          this.next();
        });
    }, RELAY_INTERVAL_MS);
  }

  private async drain(): Promise<void> {
    let relayed: number;
    do {
      relayed = await this.relay.relayPending();
    } while (relayed === RELAY_BATCH_SIZE && !this.stopped);
  }
}
