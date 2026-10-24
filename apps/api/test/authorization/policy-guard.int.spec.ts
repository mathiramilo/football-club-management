import { randomUUID } from 'node:crypto';

import {
  Controller,
  Get,
  type INestApplication,
  Injectable,
  Module,
  Patch,
  Put,
} from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  accountPolicy,
  Can,
  clubPolicy,
  idParam,
  Policies,
  type PolicyMap,
  type RouteParams,
  type ScopeLoader,
} from '../../src/core/authorization/policy.js';
import { Clock } from '../../src/core/clock/clock.js';
import type { ClubContext } from '../../src/core/database/club-scope.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import { as, type Cast, type CastActor, createCast } from '../support/club-cast.js';
import { createTestApp } from '../support/create-test-app.js';
import { createEvent } from '../support/factories.js';
import { FakeClock } from '../support/fake-clock.js';

interface TestEventScope {
  categoryIds: string[];
}

@Injectable()
class TestEventScopeLoader implements ScopeLoader<TestEventScope> {
  constructor(private readonly prisma: PrismaService) {}

  async load(club: ClubContext, params: RouteParams): Promise<TestEventScope | null> {
    const eventId = idParam(params, 'eventId');
    if (!eventId) return null;
    const event = await this.prisma.forClub(club).event.findUnique({
      where: { id: eventId },
      select: { eventCategories: { select: { categoryId: true } } },
    });
    return event && { categoryIds: event.eventCategories.map((link) => link.categoryId) };
  }
}

const testPolicies = {
  'test.rsvp.proxy': clubPolicy({
    loader: TestEventScopeLoader,
    allows: (actor, event) => actor.isAdmin || actor.isStaffOfAny(event.categoryIds),
  }),
  'test.settings.edit': clubPolicy({ allows: (actor) => actor.isAdmin }),
  'test.profile.read': accountPolicy({ allows: () => true }),
} satisfies PolicyMap;

@Policies(testPolicies)
@Controller()
class PolicyTestController {
  @Can('test.rsvp.proxy')
  @Put('clubs/:clubId/test-events/:eventId/rsvp')
  proxyRsvp() {
    return { done: true };
  }

  @Can('test.settings.edit')
  @Patch('clubs/:clubId/test-settings')
  editSettings() {
    return { done: true };
  }

  @Can('test.profile.read')
  @Get('test-profile')
  readProfile() {
    return { done: true };
  }
}

@Module({ controllers: [PolicyTestController], providers: [TestEventScopeLoader] })
class PolicyTestModule {}

const CODE_BY_STATUS: Record<number, string | undefined> = {
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
};

describe('Policy guard (TECH-05, NFR-SEC-02, NFR-SEC-03)', () => {
  const clock = new FakeClock(new Date('2026-10-23T15:00:00Z'));
  let app: INestApplication<App>;
  let db: PrismaService;
  let cast: Cast;
  let eventId: string;

  const linkEvent = (event: { id: string; clubId: string }, categoryId: string) =>
    db.eventCategory.create({ data: { eventId: event.id, categoryId, clubId: event.clubId } });
  const rsvpPath = (event = eventId, club = cast.club.id) =>
    `/v1/clubs/${club}/test-events/${event}/rsvp`;

  beforeAll(async () => {
    app = await createTestApp(
      (builder) => builder.overrideProvider(Clock).useValue(clock),
      [PolicyTestModule],
    );
    db = app.get(PrismaService);
  });

  beforeEach(async () => {
    cast = await createCast(db);
    const event = await createEvent(db, cast.club);
    await linkEvent(event, cast.category.id);
    eventId = event.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('a club action on a resource: proxy RSVP (permission matrix § 4.2)', () => {
    it.each<[string, CastActor, number]>([
      ['Owner', 'owner', 200],
      ['Club Admin without a staff role', 'adminOnly', 200],
      ['DT of the event category', 'dtOfCategory', 200],
      ['Coach of the event category', 'coachOfCategory', 200],
      ['Player-coach of the event category', 'playerCoach', 200],
      ['Player of the event category', 'player', 403],
      ['DT of another category', 'dtOfOtherCategory', 403],
      ['Player of another category', 'playerOfOtherCategory', 403],
      ['Former player of the event category (BR-ROLE-10)', 'formerPlayer', 403],
      ['Removed member', 'removedMember', 404],
      ['Member of another club', 'otherClubMember', 404],
      ['Unauthenticated', 'anonymous', 401],
    ])('%s → %i', async (_label, actorKey, status) => {
      const response = await as(app, cast.actors[actorKey]).put(rsvpPath());

      expect(response.status).toBe(status);
      expect((response.body as { code?: string }).code).toBe(CODE_BY_STATUS[status]);
    });

    it('lets staff of any category linked to the event act on it (roles § 3)', async () => {
      await linkEvent({ id: eventId, clubId: cast.club.id }, cast.otherCategory.id);

      const response = await as(app, cast.actors.dtOfOtherCategory).put(rsvpPath());

      expect(response.status).toBe(200);
    });

    it('answers 404 for an event of another club, even to the Owner', async () => {
      const foreignEvent = await createEvent(db, cast.otherClub);

      const response = await as(app, cast.actors.owner).put(rsvpPath(foreignEvent.id));

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
    });

    it.each([
      ['does not exist', () => randomUUID()],
      ['is not a UUID', () => 'not-a-uuid'],
    ])('answers 404 for an event id that %s', async (_label, id) => {
      const response = await as(app, cast.actors.owner).put(rsvpPath(id()));

      expect(response.status).toBe(404);
    });

    it('denies a DT on the next request once the role ends (BR-ROLE-08)', async () => {
      const dt = as(app, cast.actors.dtOfCategory);
      expect((await dt.put(rsvpPath())).status).toBe(200);

      await db.categoryMembership.updateMany({
        where: { clubMembershipId: cast.actors.dtOfCategory.clubMembershipId },
        data: { endsOn: new Date('2026-10-22') },
      });

      expect((await dt.put(rsvpPath())).status).toBe(403);
    });
  });

  describe('a club action without a resource: club settings (permission matrix § 4.1)', () => {
    it.each<[string, CastActor, number]>([
      ['Owner', 'owner', 200],
      ['Club Admin', 'adminOnly', 200],
      ['DT', 'dtOfCategory', 403],
      ['Player', 'player', 403],
      ['Member of another club', 'otherClubMember', 404],
      ['Unauthenticated', 'anonymous', 401],
    ])('%s → %i', async (_label, actorKey, status) => {
      const response = await as(app, cast.actors[actorKey]).patch(
        `/v1/clubs/${cast.club.id}/test-settings`,
      );

      expect(response.status).toBe(status);
    });

    it('counts the Owner as a Club Admin without is_admin (permission matrix § 4)', async () => {
      await db.clubMembership.update({
        where: { id: cast.actors.owner.clubMembershipId },
        data: { isAdmin: false },
      });

      const response = await as(app, cast.actors.owner).patch(
        `/v1/clubs/${cast.club.id}/test-settings`,
      );

      expect(response.status).toBe(200);
    });
  });

  describe('an account action', () => {
    it.each<[string, CastActor, number]>([
      ['Player', 'player', 200],
      ['Member of another club', 'otherClubMember', 200],
      ['Unauthenticated', 'anonymous', 401],
    ])('%s → %i', async (_label, actorKey, status) => {
      const response = await as(app, cast.actors[actorKey]).get('/v1/test-profile');

      expect(response.status).toBe(status);
    });
  });
});
