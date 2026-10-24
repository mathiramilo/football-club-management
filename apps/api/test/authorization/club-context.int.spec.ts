import { randomUUID } from 'node:crypto';

import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { ClubActor } from '../../src/core/authorization/club-actor.js';
import { CurrentClubActor } from '../../src/core/authorization/current-club-actor.decorator.js';
import { Clock } from '../../src/core/clock/clock.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import { as, type Cast, createCast, createSignedInMember } from '../support/club-cast.js';
import { createTestApp } from '../support/create-test-app.js';
import { createCategoryMembership } from '../support/factories.js';
import { FakeClock } from '../support/fake-clock.js';

@Controller('clubs/:clubId/test-actor')
class ClubActorController {
  @Get()
  show(@CurrentClubActor() actor: ClubActor) {
    const { clubMembershipId, isOwner, isAdmin, categories, today } = actor;
    return { clubMembershipId, isOwner, isAdmin, categories, today };
  }
}

@Module({ controllers: [ClubActorController] })
class ClubActorTestModule {}

const NOW = new Date('2026-10-23T15:00:00Z');
const actorPath = (clubId: string) => `/v1/clubs/${clubId}/test-actor`;

describe('Club context on /v1/clubs/:clubId routes (TECH-05, BR-ROLE-07)', () => {
  const clock = new FakeClock(NOW);
  let app: INestApplication<App>;
  let db: PrismaService;
  let cast: Cast;

  beforeAll(async () => {
    app = await createTestApp(
      (builder) => builder.overrideProvider(Clock).useValue(clock),
      [ClubActorTestModule],
    );
    db = app.get(PrismaService);
  });

  beforeEach(async () => {
    clock.set(NOW);
    cast = await createCast(db);
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 401 before it looks at the club', async () => {
    const response = await as(app, cast.actors.anonymous).get(actorPath(randomUUID()));

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it.each([
    ['a member of another club', 'otherClubMember', 'club'],
    ['a removed member', 'removedMember', 'club'],
    ['a club id that is not a UUID', 'player', 'not-a-uuid'],
    ['a club that does not exist', 'player', 'unknown'],
  ] as const)('answers 404 to %s', async (_label, actorKey, target) => {
    const clubId =
      target === 'club' ? cast.club.id : target === 'unknown' ? randomUUID() : 'not-a-uuid';

    const response = await as(app, cast.actors[actorKey]).get(actorPath(clubId));

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('hides a deleted club from its own Owner (BR-CLUB-13)', async () => {
    await db.club.update({
      where: { id: cast.club.id },
      data: { deletedAt: NOW, purgeAt: new Date('2026-11-22T15:00:00Z') },
    });

    const response = await as(app, cast.actors.owner).get(actorPath(cast.club.id));

    expect(response.status).toBe(404);
  });

  it('loads the caller’s club roles and current category roles', async () => {
    const owner = await as(app, cast.actors.owner).get(actorPath(cast.club.id));
    const playerCoach = await as(app, cast.actors.playerCoach).get(actorPath(cast.club.id));

    expect(owner.body).toEqual({
      clubMembershipId: cast.actors.owner.clubMembershipId,
      isOwner: true,
      isAdmin: true,
      categories: [],
      today: '2026-10-23',
    });
    expect(playerCoach.body).toMatchObject({
      isOwner: false,
      isAdmin: false,
      categories: [{ categoryId: cast.category.id, staffRole: 'coach', isPlayer: true }],
    });
  });

  it('keeps a former player in the club without their old category (BR-ROLE-10)', async () => {
    const response = await as(app, cast.actors.formerPlayer).get(actorPath(cast.club.id));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ categories: [] });
  });

  it('applies a role change on the next request (BR-ROLE-08)', async () => {
    const coach = as(app, cast.actors.coachOfCategory);
    const roles = async () =>
      ((await coach.get(actorPath(cast.club.id))).body as { categories: unknown[] }).categories;

    expect(await roles()).toEqual([
      { categoryId: cast.category.id, staffRole: 'coach', isPlayer: false },
    ]);

    await db.categoryMembership.updateMany({
      where: { clubMembershipId: cast.actors.coachOfCategory.clubMembershipId },
      data: { staffRole: 'dt' },
    });
    expect(await roles()).toEqual([
      { categoryId: cast.category.id, staffRole: 'dt', isPlayer: false },
    ]);

    await db.categoryMembership.updateMany({
      where: { clubMembershipId: cast.actors.coachOfCategory.clubMembershipId },
      data: { endsOn: new Date('2026-10-22') },
    });
    expect(await roles()).toEqual([]);
  });

  it('counts membership days in the club time zone (BR-CLUB-06)', async () => {
    const member = await createSignedInMember(db, cast.club);
    await createCategoryMembership(
      db,
      cast.category,
      { id: member.clubMembershipId },
      {
        endsOn: new Date('2026-10-23'),
      },
    );
    const categories = async () =>
      ((await as(app, member).get(actorPath(cast.club.id))).body as { categories: unknown[] })
        .categories;

    clock.set(new Date('2026-10-24T02:59:59Z'));
    expect(await categories()).toHaveLength(1);

    clock.set(new Date('2026-10-24T03:00:00Z'));
    expect(await categories()).toEqual([]);
  });
});
