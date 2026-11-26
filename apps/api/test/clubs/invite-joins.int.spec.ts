import type { INestApplication } from '@nestjs/common';
import type {
  AcceptInviteResponse,
  InviteLink,
  InviteLinksResponse,
  MyClubsResponse,
} from '@repo/contracts';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Analytics } from '../../src/core/analytics/analytics.js';
import { Clock } from '../../src/core/clock/clock.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import { as, type Cast, type CastMember, createCast, signInAs } from '../support/club-cast.js';
import { createTestApp } from '../support/create-test-app.js';
import { FakeAnalytics } from '../support/fake-analytics.js';
import { FakeClock } from '../support/fake-clock.js';
import { createCategory, createCategoryMembership, createUser } from '../support/factories.js';

const NOW = new Date('2026-11-24T15:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('POST /v1/invites/{token}/accept (AUTH-06, BR-AUTH-09, BR-AUTH-10)', () => {
  const clock = new FakeClock(NOW);
  const analytics = new FakeAnalytics();
  let app: INestApplication<App>;
  let db: PrismaService;
  let cast: Cast;

  const newcomer = async (data: Parameters<typeof createUser>[1] = {}): Promise<CastMember> => {
    const user = await createUser(db, data);
    return { userId: user.id, clubMembershipId: '', token: await signInAs(db, user.id) };
  };
  const linksPath = (categoryId = cast.category.id) =>
    `/v1/clubs/${cast.club.id}/categories/${categoryId}/invite-links`;
  const createLink = async (body: object, categoryId?: string) => {
    const response = await as(app, cast.actors.owner)
      .post(linksPath(categoryId))
      .send(body)
      .expect(201);
    return response.body as InviteLink;
  };
  const openLink = () => createLink({ role: 'player', requiresApproval: false });
  const defaultLink = async () => {
    const response = await as(app, cast.actors.owner).get(linksPath()).expect(200);
    const link = (response.body as InviteLinksResponse).items.find((item) => item.isDefault);
    if (!link) throw new Error('The category has no default link');
    return link;
  };
  const accept = (member: CastMember | null, token: string) =>
    as(app, member).post(`/v1/invites/${token}/accept`);
  const accepted = async (member: CastMember, token: string) =>
    (await accept(member, token).expect(200)).body as AcceptInviteResponse;
  const usesOf = async (link: InviteLink) =>
    (await db.inviteLink.findUniqueOrThrow({ where: { id: link.id } })).usesCount;
  const categoryMembershipsOf = (member: CastMember, categoryId = cast.category.id) =>
    db.categoryMembership.findMany({
      where: { categoryId, clubMembership: { userId: member.userId } },
      orderBy: { startsOn: 'asc' },
    });

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
    cast = await createCast(db);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('a link without approval', () => {
    it('joins the category as a player from today and counts a use', async () => {
      const link = await openLink();
      const player = await newcomer();

      await expect(accepted(player, link.token)).resolves.toEqual({
        outcome: 'joined',
        clubId: cast.club.id,
        categoryId: cast.category.id,
      });

      const memberships = await categoryMembershipsOf(player);
      expect(memberships).toEqual([
        expect.objectContaining({
          clubId: cast.club.id,
          isPlayer: true,
          staffRole: null,
          startsOn: new Date('2026-11-24'),
          endsOn: null,
        }),
      ]);
      await expect(usesOf(link)).resolves.toBe(1);
      expect(analytics.captured).toContainEqual({
        userId: player.userId,
        event: 'invite_link_accepted',
        properties: { role: 'player', outcome: 'joined' },
      });
    });

    it('lists the club and category in the new member’s clubs', async () => {
      const link = await openLink();
      const player = await newcomer();
      await accepted(player, link.token);

      const response = await as(app, player).get('/v1/me/clubs').expect(200);
      const { items } = response.body as MyClubsResponse;

      expect(items).toEqual([
        expect.objectContaining({
          club: expect.objectContaining({ id: cast.club.id }) as object,
          isAdmin: false,
          categories: [
            expect.objectContaining({
              categoryId: cast.category.id,
              isPlayer: true,
              staffRole: null,
            }),
          ],
        }),
      ]);
    });

    it('starts the membership on the club’s calendar day (BR-CLUB-06)', async () => {
      const link = await openLink();
      clock.set(new Date('2026-11-25T02:00:00Z'));
      const player = await newcomer();

      await accepted(player, link.token);

      const [membership] = await categoryMembershipsOf(player);
      expect(membership?.startsOn).toEqual(new Date('2026-11-24'));
    });

    it('records that the membership started, so its events can follow (BR-CLUB-05)', async () => {
      const link = await openLink();
      const player = await newcomer();

      await accepted(player, link.token);

      const [membership] = await categoryMembershipsOf(player);
      await expect(
        db.outboxEvent.findMany({
          where: {
            type: 'clubs.category_membership_started',
            payload: { path: ['clubId'], equals: cast.club.id },
          },
          select: { payload: true },
        }),
      ).resolves.toEqual([
        {
          payload: {
            clubId: cast.club.id,
            categoryId: cast.category.id,
            clubMembershipId: membership?.clubMembershipId,
            categoryMembershipId: membership?.id,
            startsOn: '2026-11-24',
          },
        },
      ]);
    });

    it('adds a member of another category to this one, keeping one club membership', async () => {
      const link = await openLink();
      const member = cast.actors.playerOfOtherCategory;

      await expect(accepted(member, link.token)).resolves.toMatchObject({ outcome: 'joined' });

      await expect(
        db.clubMembership.count({ where: { clubId: cast.club.id, userId: member.userId } }),
      ).resolves.toBe(1);
      await expect(categoryMembershipsOf(member)).resolves.toEqual([
        expect.objectContaining({ clubMembershipId: member.clubMembershipId, isPlayer: true }),
      ]);
    });

    it('makes a staff member of the category a player too, without a second membership', async () => {
      const link = await openLink();
      const coach = cast.actors.coachOfCategory;

      await expect(accepted(coach, link.token)).resolves.toMatchObject({ outcome: 'joined' });

      await expect(categoryMembershipsOf(coach)).resolves.toEqual([
        expect.objectContaining({ staffRole: 'coach', isPlayer: true, endsOn: null }),
      ]);
    });

    it('starts a new membership for a former player of the category', async () => {
      const link = await openLink();
      const former = cast.actors.formerPlayer;

      await expect(accepted(former, link.token)).resolves.toMatchObject({ outcome: 'joined' });

      await expect(categoryMembershipsOf(former)).resolves.toEqual([
        expect.objectContaining({ endsOn: new Date('2026-06-30') }),
        expect.objectContaining({ startsOn: new Date('2026-11-24'), endsOn: null }),
      ]);
    });

    it('gives a removed member their club membership back (BR-CLUB-12)', async () => {
      const link = await openLink();
      const removed = cast.actors.removedMember;

      await expect(accepted(removed, link.token)).resolves.toMatchObject({ outcome: 'joined' });

      await expect(
        db.clubMembership.findUniqueOrThrow({ where: { id: removed.clubMembershipId } }),
      ).resolves.toMatchObject({ status: 'active', removedAt: null });
      await expect(categoryMembershipsOf(removed)).resolves.toEqual([
        expect.objectContaining({ clubMembershipId: removed.clubMembershipId, isPlayer: true }),
      ]);
    });
  });

  describe('a link that requires approval (OQ-08)', () => {
    it('creates a pending join request instead of a membership, and counts a use', async () => {
      const link = await defaultLink();
      const player = await newcomer();

      await expect(accepted(player, link.token)).resolves.toEqual({
        outcome: 'requested',
        clubId: cast.club.id,
        categoryId: cast.category.id,
      });

      await expect(db.joinRequest.findMany({ where: { userId: player.userId } })).resolves.toEqual([
        expect.objectContaining({
          clubId: cast.club.id,
          categoryId: cast.category.id,
          inviteLinkId: link.id,
          status: 'pending',
          requestedPositions: [],
          possibleDuplicateOf: null,
          decidedAt: null,
        }),
      ]);
      await expect(db.clubMembership.count({ where: { userId: player.userId } })).resolves.toBe(0);
      await expect(usesOf(link)).resolves.toBe(1);
      await expect(
        db.outboxEvent.count({
          where: {
            type: 'clubs.category_membership_started',
            payload: { path: ['clubId'], equals: cast.club.id },
          },
        }),
      ).resolves.toBe(0);
    });

    it('keeps one pending request when accepted again', async () => {
      const link = await defaultLink();
      const player = await newcomer();
      await accepted(player, link.token);

      await expect(accepted(player, link.token)).resolves.toMatchObject({
        outcome: 'already_requested',
      });

      await expect(db.joinRequest.count({ where: { userId: player.userId } })).resolves.toBe(1);
      await expect(usesOf(link)).resolves.toBe(1);
    });

    it('keeps one pending request across two links of the same category', async () => {
      const player = await newcomer();
      await accepted(player, (await defaultLink()).token);

      const other = await createLink({ role: 'player', requiresApproval: false });

      await expect(accepted(player, other.token)).resolves.toMatchObject({
        outcome: 'already_requested',
      });
      await expect(usesOf(other)).resolves.toBe(0);
    });

    it('always asks for approval through a staff link (BR-CLUB-08)', async () => {
      const link = await createLink({ role: 'coach' });
      const coach = await newcomer();

      await expect(accepted(coach, link.token)).resolves.toMatchObject({ outcome: 'requested' });
    });

    it('creates a request for a player of the category who opens a Coach link', async () => {
      const link = await createLink({ role: 'coach' });

      await expect(accepted(cast.actors.player, link.token)).resolves.toMatchObject({
        outcome: 'requested',
      });
    });
  });

  describe('someone already in the category', () => {
    it('goes straight to it, without counting a use or creating a request', async () => {
      const link = await defaultLink();

      await expect(accepted(cast.actors.player, link.token)).resolves.toEqual({
        outcome: 'already_member',
        clubId: cast.club.id,
        categoryId: cast.category.id,
      });

      await expect(usesOf(link)).resolves.toBe(0);
      await expect(
        db.joinRequest.count({ where: { userId: cast.actors.player.userId } }),
      ).resolves.toBe(0);
    });

    it('goes straight to it even through an expired link', async () => {
      const link = await createLink({ role: 'player', expiresInDays: 1 });
      clock.advance(2 * DAY_MS);

      await expect(accepted(cast.actors.player, link.token)).resolves.toMatchObject({
        outcome: 'already_member',
      });
    });

    it('counts a DT opening a Coach link as already in the category', async () => {
      const link = await createLink({ role: 'coach' });

      await expect(accepted(cast.actors.dtOfCategory, link.token)).resolves.toMatchObject({
        outcome: 'already_member',
      });
    });
  });

  describe('a link that no longer works (BR-AUTH-10)', () => {
    it('answers 410 once the link has expired', async () => {
      const link = await createLink({ role: 'player', expiresInDays: 1 });
      clock.advance(DAY_MS);

      const response = await accept(await newcomer(), link.token).expect(410);

      expect(response.body).toMatchObject({ code: 'INVITE_LINK_INACTIVE' });
    });

    it('answers 410 once the link is revoked', async () => {
      const link = await openLink();
      await as(app, cast.actors.owner).delete(`${linksPath()}/${link.id}`).expect(204);

      await accept(await newcomer(), link.token).expect(410);
    });

    it('answers 410 once the link reaches its maximum number of uses', async () => {
      const link = await createLink({ role: 'player', requiresApproval: false, maxUses: 1 });
      await accepted(await newcomer(), link.token);

      const response = await accept(await newcomer(), link.token).expect(410);

      expect(response.body).toMatchObject({ code: 'INVITE_LINK_INACTIVE' });
      await expect(usesOf(link)).resolves.toBe(1);
    });

    it('lets only one of two people take the last use', async () => {
      const link = await createLink({ role: 'player', requiresApproval: false, maxUses: 1 });
      const [first, second] = [await newcomer(), await newcomer()];

      const statuses = (
        await Promise.all([accept(first, link.token), accept(second, link.token)])
      ).map((response) => response.status);

      expect(statuses.sort()).toEqual([200, 410]);
      await expect(usesOf(link)).resolves.toBe(1);
    });

    it('answers 410 when the category is archived', async () => {
      const link = await openLink();
      await db.category.update({ where: { id: cast.category.id }, data: { archivedAt: NOW } });

      await accept(await newcomer(), link.token).expect(410);
    });

    it('answers 404 for an unknown or malformed token, or a deleted club', async () => {
      const player = await newcomer();
      const link = await openLink();

      await accept(player, 'A'.repeat(22)).expect(404);
      await accept(player, 'not-a-token').expect(404);
      await db.club.update({ where: { id: cast.club.id }, data: { deletedAt: NOW } });
      await accept(player, link.token).expect(404);
    });
  });

  describe('who can accept', () => {
    it('requires a signed-in user (401)', async () => {
      const link = await openLink();

      await accept(null, link.token).expect(401);
    });

    it('requires the terms in force to be accepted first (AUTH-04)', async () => {
      const link = await openLink();

      const response = await accept(
        await newcomer({ legalAcceptances: undefined }),
        link.token,
      ).expect(403);

      expect(response.body).toMatchObject({ code: 'LEGAL_ACCEPTANCE_REQUIRED' });
    });

    it('requires a complete profile first (AUTH-05)', async () => {
      const link = await openLink();
      const player = await newcomer({ birthdate: null });

      const response = await accept(player, link.token).expect(409);

      expect(response.body).toMatchObject({ code: 'PROFILE_INCOMPLETE' });
      await expect(usesOf(link)).resolves.toBe(0);
    });

    it('lets a member of another club join, without touching that club', async () => {
      const link = await openLink();
      const member = cast.actors.otherClubMember;

      await expect(accepted(member, link.token)).resolves.toMatchObject({ outcome: 'joined' });

      await expect(
        db.clubMembership.findMany({
          where: { userId: member.userId },
          orderBy: { createdAt: 'asc' },
          select: { clubId: true, isAdmin: true },
        }),
      ).resolves.toEqual([
        { clubId: cast.otherClub.id, isAdmin: true },
        { clubId: cast.club.id, isAdmin: false },
      ]);
    });

    it('joins the link’s own category only', async () => {
      const otherCategoryLink = await openLink();
      const archived = await createCategory(db, cast.club, { archivedAt: NOW });
      await createCategoryMembership(db, archived, { id: cast.actors.player.clubMembershipId });

      await accepted(await newcomer(), otherCategoryLink.token);

      await expect(
        db.categoryMembership.count({ where: { categoryId: cast.otherCategory.id } }),
      ).resolves.toBe(2);
    });
  });
});
