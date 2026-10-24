import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import {
  CLUB_OWNED_MODELS,
  type ClubOwnedModel,
  ClubScopeViolation,
} from '../../src/core/database/club-scope.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import { createCategory, createClub, createUser } from '../support/factories.js';

const TABLE_BY_MODEL = {
  Category: 'categories',
  ClubMembership: 'club_memberships',
  CategoryMembership: 'category_memberships',
  Venue: 'venues',
  Event: 'events',
  EventCategory: 'event_categories',
  EventInvitee: 'event_invitees',
  RsvpChange: 'rsvp_changes',
} satisfies Record<ClubOwnedModel, string>;

describe('Club-scoped database access (TECH-05, architecture § 6.2)', () => {
  let db: PrismaService;

  beforeAll(() => {
    db = new PrismaService(inject('databaseUrl'));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  async function twoClubs() {
    const club = await createClub(db);
    const otherClub = await createClub(db);
    const category = await createCategory(db, club, { name: 'Primera' });
    const otherCategory = await createCategory(db, otherClub, { name: 'Primera' });
    return { club, otherClub, category, otherCategory, scoped: db.forClub({ clubId: club.id }) };
  }

  it('covers every table with a club_id column', async () => {
    const tables = await db.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'club_id'
      ORDER BY table_name`;

    expect(Object.keys(TABLE_BY_MODEL).sort()).toEqual([...CLUB_OWNED_MODELS].sort());
    expect(tables.map((row) => row.table_name)).toEqual(Object.values(TABLE_BY_MODEL).sort());
  });

  it('reads only rows of its club, whatever the filter says', async () => {
    const { category, otherCategory, scoped } = await twoClubs();

    const listed = await scoped.category.findMany({
      where: { OR: [{ id: category.id }, { id: otherCategory.id }] },
    });

    expect(listed.map((row) => row.id)).toEqual([category.id]);
    await expect(
      scoped.category.findUnique({ where: { id: otherCategory.id } }),
    ).resolves.toBeNull();
    await expect(
      scoped.category.findFirst({ where: { id: otherCategory.id } }),
    ).resolves.toBeNull();
    await expect(scoped.category.count({ where: { name: 'Primera' } })).resolves.toBe(1);
  });

  it('writes rows in its club and rejects rows for another club', async () => {
    const { club, otherClub, scoped } = await twoClubs();

    const created = await scoped.venue.create({ data: { clubId: club.id, name: 'Cancha 2' } });
    const many = await scoped.venue.createManyAndReturn({
      data: [
        { clubId: club.id, name: 'Cancha 3' },
        { clubId: club.id, name: 'Cancha 4' },
      ],
    });

    expect([created, ...many].map((venue) => venue.clubId)).toEqual([club.id, club.id, club.id]);
    await expect(
      scoped.venue.create({ data: { name: 'Cancha ajena', clubId: otherClub.id } }),
    ).rejects.toThrow(ClubScopeViolation);
  });

  it('updates and deletes only rows of its club', async () => {
    const { otherCategory, scoped } = await twoClubs();

    await expect(
      scoped.category.update({ where: { id: otherCategory.id }, data: { name: 'Tomada' } }),
    ).rejects.toMatchObject({ code: 'P2025' });
    await expect(scoped.category.updateMany({ data: { color: '#000000' } })).resolves.toEqual({
      count: 1,
    });
    await expect(scoped.category.deleteMany({ where: { id: otherCategory.id } })).resolves.toEqual({
      count: 0,
    });
    await expect(
      db.category.findUniqueOrThrow({ where: { id: otherCategory.id } }),
    ).resolves.toMatchObject({ name: 'Primera', color: null });
  });

  it('rejects moving a row to another club', async () => {
    const { club, otherClub, category, scoped } = await twoClubs();

    await expect(
      scoped.category.update({ where: { id: category.id }, data: { clubId: otherClub.id } }),
    ).rejects.toThrow(ClubScopeViolation);
    await expect(
      scoped.category.upsert({
        where: { id: category.id },
        create: { clubId: club.id, name: 'Reserva' },
        update: { clubId: otherClub.id },
      }),
    ).rejects.toThrow(ClubScopeViolation);
  });

  it('upserts within its club', async () => {
    const { club, otherCategory, scoped } = await twoClubs();

    const upserted = await scoped.category.upsert({
      where: { id: otherCategory.id },
      create: { clubId: club.id, name: 'Sub-20' },
      update: { name: 'Tomada' },
    });

    expect(upserted).toMatchObject({ clubId: club.id, name: 'Sub-20' });
    await expect(
      db.category.findUniqueOrThrow({ where: { id: otherCategory.id } }),
    ).resolves.toMatchObject({ name: 'Primera' });
  });

  it('scopes the club itself', async () => {
    const { club, otherClub, scoped } = await twoClubs();

    const clubs = await scoped.club.findMany({ where: { id: { in: [club.id, otherClub.id] } } });

    expect(clubs.map((row) => row.id)).toEqual([club.id]);
    await expect(
      scoped.club.update({ where: { id: otherClub.id }, data: { name: 'Tomado' } }),
    ).rejects.toMatchObject({ code: 'P2025' });
    await expect(
      scoped.club.create({ data: { name: 'Nuevo', countryCode: 'UY', timezone: 'UTC' } }),
    ).rejects.toThrow(ClubScopeViolation);
  });

  it('keeps the scope inside interactive transactions', async () => {
    const { club, otherCategory, scoped } = await twoClubs();

    const result = await scoped.$transaction(async (tx) => {
      const venue = await tx.venue.create({ data: { clubId: club.id, name: 'Cancha 5' } });
      const foreign = await tx.category.findUnique({ where: { id: otherCategory.id } });
      return { venue, foreign };
    });

    expect(result.venue.clubId).toBe(club.id);
    expect(result.foreign).toBeNull();
  });

  it('leaves models without a club untouched', async () => {
    const { scoped } = await twoClubs();
    const user = await createUser(db);

    await expect(scoped.user.findUnique({ where: { id: user.id } })).resolves.toMatchObject({
      id: user.id,
    });
  });
});
