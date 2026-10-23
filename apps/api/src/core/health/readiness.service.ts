import { setTimeout as sleep } from 'node:timers/promises';

import type { BeforeApplicationShutdown } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

export const SHUTDOWN_DRAIN_MS = Symbol('SHUTDOWN_DRAIN_MS');

const PROBE_TIMEOUT_MS = 2_000;

@Injectable()
export class ReadinessService implements BeforeApplicationShutdown {
  private readonly logger = new Logger(ReadinessService.name);
  private draining = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SHUTDOWN_DRAIN_MS) private readonly drainMs: number,
  ) {}

  async isReady(): Promise<boolean> {
    if (this.draining) {
      return false;
    }
    const timeout = new AbortController();
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        sleep(PROBE_TIMEOUT_MS, undefined, { signal: timeout.signal }).then(() => {
          throw new Error(`no answer within ${String(PROBE_TIMEOUT_MS)} ms`);
        }),
      ]);
      return true;
    } catch (error) {
      this.logger.warn(
        `Database unreachable: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return false;
    } finally {
      timeout.abort();
    }
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.draining = true;
    await sleep(this.drainMs);
  }
}
