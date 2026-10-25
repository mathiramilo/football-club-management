import { randomUUID } from 'node:crypto';

import type { Type } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PgBoss, TestClock } from 'pg-boss';
import { inject } from 'vitest';

import { type DeadLetteredJob, JobAlerts } from '../../src/core/jobs/job-alerts.js';
import { WorkerModule } from '../../src/worker.module.js';

export const POLL_MS = 2_000;

export class FakeJobAlerts extends JobAlerts {
  readonly deadLetters: DeadLetteredJob[] = [];
  readonly queueErrors: unknown[] = [];

  deadLettered(job: DeadLetteredJob): void {
    this.deadLetters.push(job);
  }

  queueFailed(error: unknown): void {
    this.queueErrors.push(error);
  }
}

export interface TestWorker {
  readonly module: TestingModule;
  readonly boss: PgBoss;
  readonly clock: TestClock;
  readonly alerts: FakeJobAlerts;
}

export function createTestBoss(clock = new TestClock(new Date('2026-11-02T12:00:00Z'))): PgBoss {
  return new PgBoss({
    connectionString: inject('databaseUrl'),
    schema: `pgboss_${randomUUID().slice(0, 8)}`,
    clock,
    __test__enableSpies: true,
  });
}

export async function startTestWorker(
  testModules: Type[],
  clock = new TestClock(new Date('2026-11-02T12:00:00Z')),
  boss = createTestBoss(clock),
): Promise<TestWorker> {
  const alerts = new FakeJobAlerts();
  const module = await Test.createTestingModule({ imports: [WorkerModule, ...testModules] })
    .overrideProvider(PgBoss)
    .useValue(boss)
    .overrideProvider(JobAlerts)
    .useValue(alerts)
    .compile();
  await module.init();
  return { module, boss, clock, alerts };
}
