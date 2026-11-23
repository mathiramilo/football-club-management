import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Analytics } from '../../src/core/analytics/analytics.js';
import { Clock } from '../../src/core/clock/clock.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import { as, type Cast, type CastMember, createCast, signInAs } from '../support/club-cast.js';
import { createTestApp } from '../support/create-test-app.js';
import { FakeAnalytics } from '../support/fake-analytics.js';
import {
  createCategory,
  createCategoryMembership,
  createClub,
  createMember,
  createUser,
} from '../support/factories.js';
import { FakeClock } from '../support/fake-clock.js';

// 22:30 on 22 November in Montevideo, already 23 November in UTC.
const NOW = new Date('2026-11-23T01:30:00Z');

const requiredFields = {
  name: 'Club Atlético Prueba',
  countryCode: 'UY',
  timezone: 'America/Montevideo',
};

describe('clubs (CLUB-01)', () => {
  const clock = new FakeClock(NOW);
  const analytics = new FakeAnalytics();
  let app: INestApplication<App>;
  let db: PrismaService;
  let creator: CastMember;

  const signedInUser = async (): Promise<CastMember> => {
    const user = await createUser(db);
    return { userId: user.id, clubMembershipId: '', token: await signInAs(db, user.id) };
  };
  const createClubAs = (actor: CastMember | null, body: object) =>
    as(app, actor).post('/v1/clubs').send(body);
  const clubCountOf = (userId: string) => db.clubMembership.count({ where: { userId } });

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(Clock)
        .useValue(clock)
        .overrideProvider(Analytics)
        .useValue(analytics),
    );
    db = app.get(PrismaService);
  });

  beforeEach(async () => {
    clock.set(NOW);
    analytics.captured.length = 0;
    creator = await signedInUser();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/clubs', () => {
    it('creates the club with the creator as Owner and Club Admin (BR-ROLE-06)', async () => {
      const response = await createClubAs(creator, requiredFields).expect(201);

      expect(response.body).toEqual({
        club: {
          id: expect.any(String) as string,
          name: 'Club Atlético Prueba',
          shortName: null,
          countryCode: 'UY',
          timezone: 'America/Montevideo',
          primaryColor: null,
          secondaryColor: null,
          crest: null,
        },
        membershipId: expect.any(String) as string,
        isOwner: true,
        isAdmin: true,
        categories: [],
      });
      const body = response.body as { club: { id: string }; membershipId: string };
      const membership = await db.clubMembership.findUniqueOrThrow({
        where: { id: body.membershipId },
      });
      expect(membership).toMatchObject({
        clubId: body.club.id,
        userId: creator.userId,
        isOwner: true,
        isAdmin: true,
        status: 'active',
      });
      expect(analytics.captured).toEqual([
        { userId: creator.userId, event: 'club_created', properties: { country: 'UY' } },
      ]);
    });

    it('stores the optional fields and normalizes country, time zone and colors', async () => {
      const response = await createClubAs(creator, {
        name: '  Club Social Prueba  ',
        shortName: 'Prueba',
        countryCode: 'ar',
        timezone: 'america/montevideo',
        primaryColor: '#1D4ED8',
        secondaryColor: '#ffffff',
      }).expect(201);

      expect(response.body).toMatchObject({
        club: {
          name: 'Club Social Prueba',
          shortName: 'Prueba',
          countryCode: 'AR',
          timezone: 'America/Montevideo',
          primaryColor: '#1d4ed8',
          secondaryColor: '#ffffff',
        },
      });
    });

    it('makes the creator DT of their first category from today in the club time zone', async () => {
      const response = await createClubAs(creator, {
        ...requiredFields,
        firstCategory: { name: 'Primera' },
      }).expect(201);

      expect(response.body).toMatchObject({
        categories: [
          {
            categoryId: expect.any(String) as string,
            name: 'Primera',
            format: 'f11',
            staffRole: 'dt',
            isPlayer: false,
          },
        ],
      });
      const { membershipId } = response.body as { membershipId: string };
      const [categoryMembership] = await db.categoryMembership.findMany({
        where: { clubMembershipId: membershipId },
      });
      expect(categoryMembership).toMatchObject({
        staffRole: 'dt',
        isPlayer: false,
        startsOn: new Date('2026-11-22'),
        endsOn: null,
      });
      expect(analytics.captured).toContainEqual({
        userId: creator.userId,
        event: 'category_created',
        properties: { format: 'f11', from_template: false },
      });
    });

    it('keeps the format chosen for the first category', async () => {
      const response = await createClubAs(creator, {
        ...requiredFields,
        firstCategory: { name: 'Futsal', format: 'futsal' },
      }).expect(201);

      expect(response.body).toMatchObject({ categories: [{ name: 'Futsal', format: 'futsal' }] });
    });

    it('lets a member of another club create a club of their own', async () => {
      const { actors } = await createCast(db);

      await createClubAs(actors.player, requiredFields).expect(201);

      expect(await clubCountOf(actors.player.userId)).toBe(2);
    });

    it.each([
      ['a missing name', { countryCode: 'UY', timezone: 'America/Montevideo' }],
      ['a one-letter name', { ...requiredFields, name: 'A' }],
      ['a name over 60 characters', { ...requiredFields, name: 'A'.repeat(61) }],
      ['a short name over 12 characters', { ...requiredFields, shortName: 'A'.repeat(13) }],
      ['a missing country', { name: 'Club Prueba', timezone: 'America/Montevideo' }],
      ['a three-letter country', { ...requiredFields, countryCode: 'URY' }],
      ['a missing time zone', { name: 'Club Prueba', countryCode: 'UY' }],
      ['an unknown time zone', { ...requiredFields, timezone: 'America/Atlantida' }],
      ['a color name', { ...requiredFields, primaryColor: 'blue' }],
      ['a short hex color', { ...requiredFields, secondaryColor: '#fff' }],
      [
        'an unknown format',
        { ...requiredFields, firstCategory: { name: 'Primera', format: 'f6' } },
      ],
      ['a one-letter category name', { ...requiredFields, firstCategory: { name: 'P' } }],
    ])('answers 400 VALIDATION_FAILED for %s and saves nothing', async (_case, body) => {
      const response = await createClubAs(creator, body).expect(400);

      expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
      expect(await clubCountOf(creator.userId)).toBe(0);
      expect(analytics.captured).toEqual([]);
    });

    it('creates one club when a request is retried with the same Idempotency-Key', async () => {
      const key = '0196a3b0-7c1e-7f00-8000-000000000001';
      const send = () =>
        createClubAs(creator, requiredFields).set('Idempotency-Key', key).expect(201);

      const first = await send();
      const retry = await send();

      expect(retry.body).toEqual(first.body);
      expect(retry.headers['idempotent-replayed']).toBe('true');
      expect(await clubCountOf(creator.userId)).toBe(1);
    });

    it('answers 401 without a session', async () => {
      await createClubAs(null, requiredFields).expect(401);
    });

    it('answers 403 LEGAL_ACCEPTANCE_REQUIRED before the terms are accepted', async () => {
      const user = await createUser(db, { legalAcceptances: undefined });
      const actor = { userId: user.id, clubMembershipId: '', token: await signInAs(db, user.id) };

      const response = await createClubAs(actor, requiredFields).expect(403);

      expect(response.body).toMatchObject({ code: 'LEGAL_ACCEPTANCE_REQUIRED' });
      expect(await clubCountOf(user.id)).toBe(0);
    });
  });

  describe('GET /v1/me/clubs', () => {
    let cast: Cast;

    beforeAll(async () => {
      cast = await createCast(db);
    });

    const listAs = (actor: CastMember | null) => as(app, actor).get('/v1/me/clubs');
    const createSignedInUserInClub = async (clubId: string): Promise<CastMember> => {
      const user = await createUser(db);
      const membership = await createMember(db, { id: clubId }, { userId: user.id });
      return {
        userId: user.id,
        clubMembershipId: membership.id,
        token: await signInAs(db, user.id),
      };
    };

    it('is empty for a user with no club', async () => {
      const response = await listAs(creator).expect(200);

      expect(response.body).toEqual({ items: [] });
    });

    it("shows a DT's club with their current category role", async () => {
      const response = await listAs(cast.actors.dtOfCategory).expect(200);

      expect(response.body).toEqual({
        items: [
          {
            club: expect.objectContaining({ id: cast.club.id, name: cast.club.name }) as object,
            membershipId: cast.actors.dtOfCategory.clubMembershipId,
            isOwner: false,
            isAdmin: false,
            categories: [
              {
                categoryId: cast.category.id,
                name: 'Primera',
                format: 'f11',
                staffRole: 'dt',
                isPlayer: false,
              },
            ],
          },
        ],
      });
    });

    it('counts the Owner as Club Admin', async () => {
      const response = await listAs(cast.actors.owner).expect(200);

      expect(response.body).toMatchObject({
        items: [{ isOwner: true, isAdmin: true, categories: [] }],
      });
    });

    it('leaves out ended memberships, but keeps the club', async () => {
      const response = await listAs(cast.actors.formerPlayer).expect(200);

      expect(response.body).toMatchObject({
        items: [{ club: { id: cast.club.id }, categories: [] }],
      });
    });

    it('leaves out memberships that start later and archived categories', async () => {
      const member = await createSignedInUserInClub(cast.club.id);
      const future = await createCategory(db, cast.club, { name: 'Sub-20' });
      const archived = await createCategory(db, cast.club, {
        name: 'Veteranos',
        archivedAt: new Date('2026-10-01T12:00:00Z'),
      });
      await createCategoryMembership(
        db,
        future,
        { id: member.clubMembershipId },
        {
          startsOn: new Date('2026-11-23'),
        },
      );
      await createCategoryMembership(db, archived, { id: member.clubMembershipId });

      const response = await listAs(member).expect(200);

      expect(response.body).toMatchObject({ items: [{ categories: [] }] });
    });

    it('counts the club calendar day, not the UTC one', async () => {
      const member = await createSignedInUserInClub(cast.club.id);
      const category = await createCategory(db, cast.club, { name: 'Sub-18' });
      await createCategoryMembership(
        db,
        category,
        { id: member.clubMembershipId },
        {
          endsOn: new Date('2026-11-22'),
        },
      );

      const response = await listAs(member).expect(200);

      expect(response.body).toMatchObject({
        items: [{ categories: [{ categoryId: category.id, isPlayer: true }] }],
      });
    });

    it('lists every club of the user by name, and no one else’s', async () => {
      const user = await createUser(db);
      const actor = { userId: user.id, clubMembershipId: '', token: await signInAs(db, user.id) };
      const zeta = await createClub(db, { name: 'Zeta Fútbol Club' });
      const alfa = await createClub(db, { name: 'Alfa Fútbol Club' });
      await createMember(db, zeta, { userId: user.id });
      await createMember(db, alfa, { userId: user.id, isAdmin: true });

      const response = await listAs(actor).expect(200);

      expect(response.body).toMatchObject({
        items: [
          { club: { id: alfa.id, name: 'Alfa Fútbol Club' }, isAdmin: true },
          { club: { id: zeta.id, name: 'Zeta Fútbol Club' }, isAdmin: false },
        ],
      });
      expect((response.body as { items: unknown[] }).items).toHaveLength(2);
    });

    it('hides clubs the user was removed from and deleted clubs', async () => {
      const user = await createUser(db);
      const actor = { userId: user.id, clubMembershipId: '', token: await signInAs(db, user.id) };
      const deleted = await createClub(db, { deletedAt: new Date('2026-11-01T12:00:00Z') });
      await createMember(db, deleted, { userId: user.id, isOwner: true, isAdmin: true });
      await createMember(db, cast.club, {
        userId: user.id,
        status: 'removed',
        removedAt: new Date('2026-11-01T12:00:00Z'),
      });

      const response = await listAs(actor).expect(200);

      expect(response.body).toEqual({ items: [] });
    });

    it('shows a member of another club only that club', async () => {
      const response = await listAs(cast.actors.otherClubMember).expect(200);

      expect(response.body).toMatchObject({ items: [{ club: { id: cast.otherClub.id } }] });
      expect((response.body as { items: unknown[] }).items).toHaveLength(1);
    });

    it('shows a newly created club', async () => {
      await createClubAs(creator, { ...requiredFields, name: 'Club Nuevo' }).expect(201);

      const response = await listAs(creator).expect(200);

      expect(response.body).toMatchObject({
        items: [{ club: { name: 'Club Nuevo' }, isOwner: true, isAdmin: true }],
      });
    });

    it('answers 401 without a session', async () => {
      await listAs(null).expect(401);
    });
  });
});
