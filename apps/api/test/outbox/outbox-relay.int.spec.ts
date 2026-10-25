import { randomUUID } from 'node:crypto';

import { Injectable, Module } from '@nestjs/common';
import { TestClock } from 'pg-boss';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';
import { z } from 'zod';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { eventQueue, type JobData, JobHandler } from '../../src/core/jobs/job-queue.js';
import { domainEvent } from '../../src/core/outbox/domain-event.js';
import { Outbox } from '../../src/core/outbox/outbox.js';
import { OutboxMaintenance } from '../../src/core/outbox/outbox-maintenance.js';
import { OutboxRelay } from '../../src/core/outbox/outbox-relay.js';
import { createClub } from '../support/factories.js';
import { POLL_MS, startTestWorker, type TestWorker } from '../support/test-worker.js';

const memberJoined = domainEvent('test.member_joined', { clubId: z.uuid(), memberId: z.uuid() });
const sendWelcome = eventQueue('test.send_welcome', memberJoined);
const updateRoster = eventQueue('test.update_roster', memberJoined);
const openCategory = eventQueue('test.open_category', memberJoined, {
  retryLimit: 1,
  retryDelaySeconds: 1,
});

@Injectable()
class MemberJoinedHandlers {
  readonly welcomed: JobData<typeof sendWelcome>[] = [];
  readonly rostered: string[] = [];
  categoryAttempts = 0;

  constructor(private readonly prisma: PrismaService) {}

  @JobHandler(sendWelcome)
  welcome(data: JobData<typeof sendWelcome>): void {
    this.welcomed.push(data);
  }

  @JobHandler(updateRoster)
  addToRoster({ memberId }: JobData<typeof updateRoster>): void {
    this.rostered.push(memberId);
  }

  @JobHandler(openCategory)
  async openCategory({ clubId, outboxEventId }: JobData<typeof openCategory>): Promise<void> {
    this.categoryAttempts += 1;
    await this.prisma.forClub({ clubId }).category.createMany({
      data: [{ id: outboxEventId, clubId, name: `Sub-14 ${outboxEventId}` }],
      skipDuplicates: true,
    });
    if (this.categoryAttempts === 1) throw new Error('the worker stopped after the write');
  }
}

@Module({ providers: [MemberJoinedHandlers] })
class MemberJoinedModule {}

describe('Outbox relay (TECH-07)', { timeout: 30_000 }, () => {
  let db: PrismaService;
  const outbox = new Outbox();

  beforeAll(() => {
    db = new PrismaService(inject('databaseUrl'));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  async function withWorker(
    test: (worker: TestWorker) => Promise<void>,
    options: { relayLoop?: boolean; clock?: TestClock } = {},
  ): Promise<void> {
    const worker = await startTestWorker([MemberJoinedModule], options);
    try {
      await test(worker);
    } finally {
      await worker.module.close();
    }
  }

  async function memberJoins() {
    const club = await createClub(db);
    const payload = { clubId: club.id, memberId: randomUUID() };
    await db.$transaction((tx) => outbox.add(tx, memberJoined, payload));
    const row = await db.outboxEvent.findFirstOrThrow({
      where: { payload: { path: ['memberId'], equals: payload.memberId } },
    });
    return { ...payload, outboxEventId: row.id };
  }

  const rowOf = (outboxEventId: string) =>
    db.outboxEvent.findUniqueOrThrow({ where: { id: outboxEventId } });

  async function relayAll(worker: TestWorker): Promise<void> {
    const relay = worker.module.get(OutboxRelay);
    while ((await relay.relayPending()) > 0);
  }

  it('delivers an event to every queue that handles it, then marks it processed', () =>
    withWorker(async (worker) => {
      const handlers = worker.module.get(MemberJoinedHandlers);
      const welcomes = worker.boss.getSpy<JobData<typeof sendWelcome>>(sendWelcome.name);
      const rosters = worker.boss.getSpy<JobData<typeof updateRoster>>(updateRoster.name);
      const joined = await memberJoins();

      await relayAll(worker);
      await worker.clock.tick(POLL_MS);

      await welcomes.waitForJob((data) => data.memberId === joined.memberId, 'completed');
      await rosters.waitForJob((data) => data.memberId === joined.memberId, 'completed');
      expect(handlers.welcomed).toEqual([joined]);
      expect(handlers.rostered).toEqual([joined.memberId]);
      expect((await rowOf(joined.outboxEventId)).processedAt).not.toBeNull();
    }));

  it('never relays an event twice when relays run at the same time', () =>
    withWorker(async (worker) => {
      const relay = worker.module.get(OutboxRelay);
      const joined = await memberJoins();

      await Promise.all([relay.relayPending(), relay.relayPending(), relay.relayPending()]);

      await expect(
        worker.boss.findJobs(sendWelcome.name, { data: { memberId: joined.memberId } }),
      ).resolves.toHaveLength(1);
    }));

  it('keeps an event pending and records the failure when publishing fails', () =>
    withWorker(async (worker) => {
      const joined = await memberJoins();
      vi.spyOn(worker.boss, 'publish').mockRejectedValueOnce(
        new Error('could not reach lucia.prueba@example.test'),
      );

      await worker.module.get(OutboxRelay).relayPending();

      await expect(rowOf(joined.outboxEventId)).resolves.toMatchObject({
        processedAt: null,
        attempts: 1,
        lastError: 'Error',
      });
      expect(worker.alerts.queueErrors).toHaveLength(1);

      await relayAll(worker);
      expect((await rowOf(joined.outboxEventId)).processedAt).not.toBeNull();
    }));

  it('lets a handler that is retried after its write apply the write once', () =>
    withWorker(async (worker) => {
      const handlers = worker.module.get(MemberJoinedHandlers);
      const categories = worker.boss.getSpy<JobData<typeof openCategory>>(openCategory.name);
      const joined = await memberJoins();

      await relayAll(worker);
      await worker.clock.tick(POLL_MS);
      await worker.clock.setTime(worker.clock.now() + 60_000);
      await worker.clock.tick(POLL_MS);

      await categories.waitForJob((data) => data.memberId === joined.memberId, 'completed');
      expect(handlers.categoryAttempts).toBe(2);
      await expect(db.category.count({ where: { id: joined.outboxEventId } })).resolves.toBe(1);
    }));

  it('relays pending events in the background', () =>
    withWorker(
      async () => {
        const joined = await memberJoins();

        await vi.waitFor(
          async () => {
            expect((await rowOf(joined.outboxEventId)).processedAt).not.toBeNull();
          },
          { timeout: 10_000 },
        );
      },
      { relayLoop: true },
    ));
});

describe('Outbox maintenance (TECH-07)', { timeout: 30_000 }, () => {
  let db: PrismaService;

  beforeAll(() => {
    db = new PrismaService(inject('databaseUrl'));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('alerts when an event has waited to be relayed for more than 2 minutes (NFR-OBS-03)', async () => {
    const worker = await startTestWorker([], { clock: new TestClock(Date.now() + 3 * 60_000) });
    try {
      await db.outboxEvent.create({ data: { type: 'test.member_joined', payload: {} } });

      await worker.module.get(OutboxMaintenance).checkPending();

      expect(worker.alerts.lags.map(({ source }) => source)).toEqual(['outbox']);
    } finally {
      await db.outboxEvent.deleteMany({
        where: { type: 'test.member_joined', payload: { equals: {} } },
      });
      await worker.module.close();
    }
  });

  it('deletes processed events after 7 days and keeps the rest', async () => {
    const now = new Date('2026-11-02T04:30:00Z');
    const worker = await startTestWorker([], { clock: new TestClock(now) });
    try {
      const marker = randomUUID();
      const event = (processedAt: Date | null) => ({
        type: 'test.member_joined',
        payload: { marker },
        processedAt,
      });
      await db.outboxEvent.createMany({
        data: [
          event(new Date('2026-10-26T04:29:00Z')),
          event(new Date('2026-10-26T04:31:00Z')),
          event(null),
        ],
      });

      await worker.module.get(OutboxMaintenance).purgeProcessed();

      const left = await db.outboxEvent.findMany({
        where: { payload: { path: ['marker'], equals: marker } },
        select: { processedAt: true },
        orderBy: { processedAt: 'asc' },
      });
      expect(left).toEqual([
        { processedAt: new Date('2026-10-26T04:31:00Z') },
        { processedAt: null },
      ]);
    } finally {
      await worker.module.close();
    }
  });
});
