import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { seedDatabase } from '../../prisma/seed/seed-database.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';

describe('Synthetic seed generator (TECH-03)', { timeout: 30_000 }, () => {
  let db: PrismaService;

  beforeAll(() => {
    db = new PrismaService(inject('databaseUrl'));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('fills a club with rosters, a season of events, RSVPs and roll calls', async () => {
    const today = '2026-10-23';
    const { clubIds, counts } = await seedDatabase(db, { clubs: 1, months: 2, seed: 7, today });
    const clubId = clubIds[0] ?? '';

    expect(counts.clubs).toBe(1);
    expect(await db.clubMembership.count({ where: { clubId, isOwner: true } })).toBe(1);
    expect(await db.categoryMembership.count({ where: { clubId, staffRole: 'dt' } })).toBe(
      counts.categories,
    );
    expect(await db.eventInvitee.count({ where: { clubId } })).toBe(counts.eventInvitees);
    expect(
      await db.eventInvitee.count({ where: { clubId, attendanceStatus: { not: null } } }),
    ).toBeGreaterThan(0);
    expect(
      await db.event.count({ where: { clubId, startsAt: { gt: new Date(`${today}T23:59:59Z`) } } }),
    ).toBeGreaterThan(0);
    expect(
      await db.user.count({
        where: {
          clubMemberships: { some: { clubId } },
          email: { not: { endsWith: '@example.test' } },
        },
      }),
    ).toBe(0);
  });

  it('seeds a one-month period with only account holders aged 16 or more (BR-AUTH-05)', async () => {
    const today = '2026-10-23';
    const { clubIds } = await seedDatabase(db, { clubs: 1, months: 1, seed: 7, today });

    expect(
      await db.user.count({
        where: {
          clubMemberships: { some: { clubId: clubIds[0] ?? '' } },
          birthdate: { gt: new Date('2010-10-23') },
        },
      }),
    ).toBe(0);
  });
});
