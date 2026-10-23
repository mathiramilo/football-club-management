import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { expectViolation } from '../support/constraints.js';
import { createUser } from '../support/factories.js';

describe('Idempotency key invariants (TECH-06)', () => {
  let db: PrismaService;

  beforeAll(() => {
    db = new PrismaService(inject('databaseUrl'));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  const attempt = (userId: string) => ({
    userId,
    key: randomUUID(),
    requestHash: 'hash',
    startedAt: new Date(),
  });

  it('stores only final statuses below 500', async () => {
    const user = await createUser(db);

    await expectViolation(
      db.idempotencyKey.create({ data: { ...attempt(user.id), responseStatus: 503 } }),
      'idempotency_keys_response_status_check',
    );
  });

  it('never stores a body without its status', async () => {
    const user = await createUser(db);

    await expectViolation(
      db.idempotencyKey.create({ data: { ...attempt(user.id), responseBody: { id: 'a' } } }),
      'idempotency_keys_response_body_needs_status_check',
    );
  });

  it("removes a user's stored responses with the user", async () => {
    const user = await createUser(db);
    await db.idempotencyKey.create({
      data: { ...attempt(user.id), responseStatus: 201, responseBody: { id: 'a' } },
    });

    await db.user.delete({ where: { id: user.id } });

    await expect(db.idempotencyKey.count({ where: { userId: user.id } })).resolves.toBe(0);
  });
});
