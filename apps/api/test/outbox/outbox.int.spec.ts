import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { z } from 'zod';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { domainEvent } from '../../src/core/outbox/domain-event.js';
import { Outbox } from '../../src/core/outbox/outbox.js';
import { createClub } from '../support/factories.js';

const categoryCreated = domainEvent('test.category_created', {
  clubId: z.uuid(),
  categoryId: z.uuid(),
});

describe('Outbox (TECH-07)', () => {
  let db: PrismaService;
  const outbox = new Outbox();

  beforeAll(() => {
    db = new PrismaService(inject('databaseUrl'));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  const eventsFor = (categoryId: string) =>
    db.outboxEvent.findMany({
      where: { type: categoryCreated.type, payload: { path: ['categoryId'], equals: categoryId } },
    });

  it('stores the event in the transaction of the change it belongs to', async () => {
    const club = await createClub(db);
    const categoryId = randomUUID();

    await db.forClub({ clubId: club.id }).$transaction(async (tx) => {
      await tx.category.create({ data: { id: categoryId, clubId: club.id, name: 'Primera' } });
      await outbox.add(tx, categoryCreated, { clubId: club.id, categoryId });
    });

    const [event, ...others] = await eventsFor(categoryId);
    expect(others).toEqual([]);
    expect(event).toMatchObject({
      type: 'test.category_created',
      payload: { clubId: club.id, categoryId },
    });
  });

  it('stores nothing when the change rolls back', async () => {
    const club = await createClub(db);
    const categoryId = randomUUID();

    await expect(
      db.$transaction(async (tx) => {
        await tx.category.create({ data: { id: categoryId, clubId: club.id, name: 'Reserva' } });
        await outbox.add(tx, categoryCreated, { clubId: club.id, categoryId });
        throw new Error('the change failed after the event was written');
      }),
    ).rejects.toThrow('the change failed');

    await expect(eventsFor(categoryId)).resolves.toEqual([]);
    await expect(db.category.count({ where: { id: categoryId } })).resolves.toBe(0);
  });

  it('refuses a payload with fields its event does not declare', async () => {
    const club = await createClub(db);
    const categoryId = randomUUID();
    const withName = { clubId: club.id, categoryId, name: 'Primera' };

    await expect(
      db.$transaction((tx) => outbox.add(tx, categoryCreated, withName)),
    ).rejects.toThrow(z.ZodError);
    await expect(eventsFor(categoryId)).resolves.toEqual([]);
  });
});
