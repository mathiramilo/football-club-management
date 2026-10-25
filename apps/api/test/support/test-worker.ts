import { randomUUID } from 'node:crypto';

import type { Type } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PgBoss, TestClock } from 'pg-boss';
import { inject } from 'vitest';

import { Clock } from '../../src/core/clock/clock.js';
import { type DeadLetteredJob, JobAlerts } from '../../src/core/jobs/job-alerts.js';
import { PG_BOSS_OPTIONS } from '../../src/core/jobs/jobs.module.js';
import { OutboxRelayLoop } from '../../src/core/outbox/outbox-relay.js';
import { WorkerModule } from '../../src/worker.module.js';

export const POLL_MS = 2_000;

export class FakeJobAlerts extends JobAlerts {
  readonly deadLetters: DeadLetteredJob[] = [];
  readonly queueErrors: unknown[] = [];
  readonly lags: { source: string; waitedSeconds: number }[] = [];
  readonly deadLettersWaitingCounts: number[] = [];

  deadLettered(job: DeadLetteredJob): void {
    this.deadLetters.push(job);
  }

  queueFailed(error: unknown): void {
    this.queueErrors.push(error);
  }

  lagging(source: string, waitedSeconds: number): void {
    this.lags.push({ source, waitedSeconds });
  }

  deadLettersWaiting(count: number): void {
    this.deadLettersWaitingCounts.push(count);
  }
}

class TestClockAdapter extends Clock {
  constructor(private readonly clock: TestClock) {
    super();
  }

  now(): Date {
    return new Date(this.clock.now());
  }
}

export interface TestWorker {
  readonly module: TestingModule;
  readonly boss: PgBoss;
  readonly clock: TestClock;
  readonly alerts: FakeJobAlerts;
}

export interface TestWorkerOptions {
  readonly clock?: TestClock;
  readonly boss?: PgBoss;
  readonly relayLoop?: boolean;
}

export function createTestBoss(clock = new TestClock(new Date('2026-11-02T12:00:00Z'))): PgBoss {
  return new PgBoss({
    ...PG_BOSS_OPTIONS,
    connectionString: inject('databaseUrl'),
    max: 3,
    schema: `pgboss_${randomUUID().slice(0, 8)}`,
    clock,
    __test__enableSpies: true,
  });
}

export async function startTestWorker(
  testModules: Type[],
  options: TestWorkerOptions = {},
): Promise<TestWorker> {
  const clock = options.clock ?? new TestClock(new Date('2026-11-02T12:00:00Z'));
  const boss = options.boss ?? createTestBoss(clock);
  const alerts = new FakeJobAlerts();
  let builder = Test.createTestingModule({ imports: [WorkerModule, ...testModules] })
    .overrideProvider(PgBoss)
    .useValue(boss)
    .overrideProvider(JobAlerts)
    .useValue(alerts)
    .overrideProvider(Clock)
    .useValue(new TestClockAdapter(clock));
  if (!options.relayLoop) builder = builder.overrideProvider(OutboxRelayLoop).useValue({});
  const module = await builder.compile();
  await module.init();
  return { module, boss, clock, alerts };
}
