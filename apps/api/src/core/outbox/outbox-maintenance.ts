import { Injectable } from '@nestjs/common';
import { differenceInSeconds, subDays } from 'date-fns';

import { Clock } from '../clock/clock.js';
import { PrismaService } from '../database/prisma.service.js';
import { JobAlerts } from '../jobs/job-alerts.js';
import { MAX_WAIT_SECONDS } from '../jobs/job-monitor.js';
import { JobHandler, jobQueue } from '../jobs/job-queue.js';

const PROCESSED_RETENTION_DAYS = 7;

export const checkOutbox = jobQueue(
  'outbox.check_pending',
  {},
  { schedule: { cron: '* * * * *' }, retryLimit: 0 },
);

export const purgeOutbox = jobQueue(
  'outbox.purge_processed',
  {},
  { schedule: { cron: '30 4 * * *' } },
);

@Injectable()
export class OutboxMaintenance {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
    private readonly alerts: JobAlerts,
  ) {}

  @JobHandler(checkOutbox)
  async checkPending(): Promise<void> {
    const oldest = await this.prisma.outboxEvent.findFirst({
      where: { processedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    if (!oldest) return;
    const waitedSeconds = differenceInSeconds(this.clock.now(), oldest.createdAt);
    if (waitedSeconds > MAX_WAIT_SECONDS) this.alerts.lagging('outbox', waitedSeconds);
  }

  @JobHandler(purgeOutbox)
  async purgeProcessed(): Promise<void> {
    await this.prisma.outboxEvent.deleteMany({
      where: { processedAt: { lt: subDays(this.clock.now(), PROCESSED_RETENTION_DAYS) } },
    });
  }
}
