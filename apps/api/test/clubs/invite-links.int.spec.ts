import type { INestApplication } from '@nestjs/common';
import type { InviteLink, InviteLinksResponse, InvitePreview, MyClub } from '@repo/contracts';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Analytics } from '../../src/core/analytics/analytics.js';
import { Clock } from '../../src/core/clock/clock.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import {
  as,
  type Cast,
  type CastActor,
  type CastMember,
  createCast,
  signInAs,
} from '../support/club-cast.js';
import { createTestApp } from '../support/create-test-app.js';
import { FakeAnalytics } from '../support/fake-analytics.js';
import { FakeClock } from '../support/fake-clock.js';
import { createUser } from '../support/factories.js';

const NOW = new Date('2026-11-24T15:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('invite links (CLUB-05, BR-CLUB-08, BR-AUTH-10)', () => {
  const clock = new FakeClock(NOW);
  const analytics = new FakeAnalytics();
  let app: INestApplication<App>;
  let db: PrismaService;
  let cast: Cast;

  const linksPath = (categoryId = cast.category.id, clubId = cast.club.id) =>
    `/v1/clubs/${clubId}/categories/${categoryId}/invite-links`;
  const linkPath = (linkId: string, categoryId = cast.category.id) =>
    `${linksPath(categoryId)}/${linkId}`;
  const actor = (name: Exclude<CastActor, 'anonymous'>): CastMember => cast.actors[name];

  const listAs = async (member: CastMember | null, categoryId?: string) => {
    const response = await as(app, member).get(linksPath(categoryId)).expect(200);
    return (response.body as InviteLinksResponse).items;
  };
  const createAs = (member: CastMember | null, body: object, categoryId?: string) =>
    as(app, member).post(linksPath(categoryId)).send(body);
  const createdBy = async (member: CastMember, body: object) =>
    (await createAs(member, body).expect(201)).body as InviteLink;
  const defaultLink = async () => {
    const link = (await listAs(actor('owner'))).find((item) => item.isDefault);
    if (!link) throw new Error('The category has no default link');
    return link;
  };
  const preview = (token: string) => as(app, null).get(`/v1/public/invites/${token}`);

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

  describe('default player link (CLUB-05)', () => {
    it('comes with each new club category, requiring approval (OQ-08)', async () => {
      const user = await createUser(db);
      const creator = { userId: user.id, clubMembershipId: '', token: await signInAs(db, user.id) };
      const created = await as(app, creator)
        .post('/v1/clubs')
        .send({
          name: 'Club Atlético Prueba',
          countryCode: 'UY',
          timezone: 'America/Montevideo',
          firstCategory: { name: 'Primera' },
        })
        .expect(201);
      const { club } = created.body as MyClub;
      const categoryId = (created.body as MyClub).categories[0]?.categoryId ?? '';

      const rows = await db.inviteLink.findMany({ where: { clubId: club.id, categoryId } });

      expect(rows).toEqual([
        expect.objectContaining({
          role: 'player',
          isDefault: true,
          requiresApproval: true,
          expiresAt: null,
          maxUses: null,
          revokedAt: null,
          code: expect.stringMatching(/^[A-HJ-NP-Z2-9]{6}$/) as string,
        }),
      ]);
    });

    it('is created for an older category the first time its links are listed', async () => {
      const items = await listAs(actor('dtOfCategory'));

      expect(items).toEqual([
        {
          id: expect.any(String) as string,
          categoryId: cast.category.id,
          role: 'player',
          isDefault: true,
          token: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/) as string,
          requiresApproval: true,
          expiresAt: null,
          maxUses: null,
          usesCount: 0,
          createdAt: expect.any(String) as string,
          canRevoke: true,
          canChangeApproval: true,
        },
      ]);
      await listAs(actor('owner'));
      await expect(
        db.inviteLink.count({ where: { categoryId: cast.category.id, isDefault: true } }),
      ).resolves.toBe(1);
    });

    it('keeps the same link, so staff can copy it again at any time', async () => {
      const first = await defaultLink();
      clock.advance(400 * DAY_MS);

      await expect(defaultLink()).resolves.toEqual(first);
    });

    it('stores only a hash of the token', async () => {
      const link = await defaultLink();
      const row = await db.inviteLink.findUniqueOrThrow({ where: { id: link.id } });

      expect(JSON.stringify(row)).not.toContain(link.token);
    });

    it('is replaced by a new default link when revoked, with the same approval setting', async () => {
      const old = await defaultLink();
      await as(app, actor('dtOfCategory'))
        .patch(linkPath(old.id))
        .send({ requiresApproval: false })
        .expect(200);

      await as(app, actor('dtOfCategory')).delete(linkPath(old.id)).expect(204);

      const replacement = await defaultLink();
      expect(replacement.id).not.toBe(old.id);
      expect(replacement.token).not.toBe(old.token);
      expect(replacement).toMatchObject({ isDefault: true, requiresApproval: false });
      expect(((await preview(old.token).expect(200)).body as InvitePreview).status).toBe('revoked');
    });

    it('rejects a second open default link in the database', async () => {
      const link = await defaultLink();
      const row = await db.inviteLink.findUniqueOrThrow({ where: { id: link.id } });

      await expect(
        db.inviteLink.create({
          data: { ...row, id: undefined, tokenHash: 'other-hash', code: 'ZZZZZZ' },
        }),
      ).rejects.toThrow();
    });
  });

  describe('GET /v1/clubs/:clubId/categories/:categoryId/invite-links', () => {
    it('lists only active links: not revoked, expired or used up (BR-AUTH-10)', async () => {
      const owner = actor('owner');
      const revoked = await createdBy(owner, { role: 'player' });
      await as(app, owner).delete(linkPath(revoked.id)).expect(204);
      const expiring = await createdBy(owner, { role: 'player', expiresInDays: 1 });
      const usedUp = await createdBy(owner, { role: 'player', maxUses: 2 });
      await db.inviteLink.update({ where: { id: usedUp.id }, data: { usesCount: 2 } });
      const lasting = await createdBy(owner, { role: 'coach', expiresInDays: 90 });

      expect((await listAs(owner)).map((link) => link.id)).toEqual([
        (await defaultLink()).id,
        lasting.id,
        expiring.id,
      ]);
      clock.advance(DAY_MS);
      expect((await listAs(owner)).map((link) => link.id)).not.toContain(expiring.id);
    });

    it('shows each role only the links it could create (BR-CLUB-08)', async () => {
      const owner = actor('owner');
      const dtLink = await createdBy(owner, { role: 'dt' });
      const coachLink = await createdBy(owner, { role: 'coach' });
      const openPlayerLink = await createdBy(owner, { role: 'player', requiresApproval: false });
      const defaultId = (await defaultLink()).id;
      const idsSeenBy = async (name: Exclude<CastActor, 'anonymous'>) =>
        (await listAs(actor(name))).map((link) => link.id).sort();

      expect(await idsSeenBy('adminOnly')).toEqual(
        [defaultId, dtLink.id, coachLink.id, openPlayerLink.id].sort(),
      );
      expect(await idsSeenBy('dtOfCategory')).toEqual(
        [defaultId, coachLink.id, openPlayerLink.id].sort(),
      );
      expect(await idsSeenBy('coachOfCategory')).toEqual([defaultId]);
    });

    it('tells a Coach which links they can revoke', async () => {
      const coach = actor('coachOfCategory');
      const own = await createdBy(coach, { role: 'player' });

      const items = await listAs(coach);

      expect(
        items.map(({ id, canRevoke, canChangeApproval }) => ({ id, canRevoke, canChangeApproval })),
      ).toEqual([
        { id: (await defaultLink()).id, canRevoke: false, canChangeApproval: false },
        { id: own.id, canRevoke: true, canChangeApproval: false },
      ]);
    });

    it.each<Exclude<CastActor, 'anonymous'>>([
      'player',
      'dtOfOtherCategory',
      'formerPlayer',
      'playerOfOtherCategory',
    ])('answers 403 to the %s', async (name) => {
      const response = await as(app, actor(name)).get(linksPath()).expect(403);
      expect(response.body).toMatchObject({ code: 'FORBIDDEN' });
    });

    it.each<Exclude<CastActor, 'anonymous'>>(['removedMember', 'otherClubMember'])(
      'answers 404 to the %s',
      async (name) => {
        const response = await as(app, actor(name)).get(linksPath()).expect(404);
        expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
      },
    );

    it('answers 401 to an anonymous caller', async () => {
      await as(app, null).get(linksPath()).expect(401);
    });

    it("answers 404 for another club's category or an archived one", async () => {
      const otherClubCategory = await db.category.create({
        data: { clubId: cast.otherClub.id, name: 'Primera' },
      });
      await as(app, actor('owner')).get(linksPath(otherClubCategory.id)).expect(404);

      await db.category.update({ where: { id: cast.category.id }, data: { archivedAt: NOW } });
      await as(app, actor('owner')).get(linksPath()).expect(404);
    });
  });

  describe('POST /v1/clubs/:clubId/categories/:categoryId/invite-links', () => {
    it('creates a link that requires approval and expires in 30 days by default (BR-AUTH-10)', async () => {
      const response = await createAs(actor('adminOnly'), { role: 'dt' }).expect(201);

      expect(response.body).toMatchObject({
        role: 'dt',
        isDefault: false,
        requiresApproval: true,
        expiresAt: new Date(NOW.getTime() + 30 * DAY_MS).toISOString(),
        maxUses: null,
        usesCount: 0,
        canRevoke: true,
        canChangeApproval: false,
      });
      expect(analytics.captured).toEqual([
        {
          userId: actor('adminOnly').userId,
          event: 'invite_link_created',
          properties: { role: 'dt', approval_required: true },
        },
      ]);
    });

    it('takes an expiry of 1 to 90 days and an optional maximum number of uses', async () => {
      const response = await createAs(actor('dtOfCategory'), {
        role: 'player',
        expiresInDays: 90,
        maxUses: 25,
        requiresApproval: false,
      }).expect(201);

      expect(response.body).toMatchObject({
        expiresAt: new Date(NOW.getTime() + 90 * DAY_MS).toISOString(),
        maxUses: 25,
        requiresApproval: false,
      });
      for (const expiresInDays of [0, 91]) {
        const invalid = await createAs(actor('dtOfCategory'), { role: 'player', expiresInDays });
        expect(invalid.status).toBe(400);
        expect(invalid.body).toMatchObject({ code: 'VALIDATION_FAILED' });
      }
    });

    it('lets DTs create player and Coach links but not DT links (BR-CLUB-08)', async () => {
      const dt = actor('dtOfCategory');
      await createAs(dt, { role: 'player' }).expect(201);
      await createAs(dt, { role: 'coach' }).expect(201);

      const response = await createAs(dt, { role: 'dt' }).expect(403);
      expect(response.body).toMatchObject({ code: 'FORBIDDEN' });
    });

    it('lets Coaches create only player links, always with approval (BR-CLUB-08)', async () => {
      const coach = actor('coachOfCategory');
      const created = await createAs(coach, { role: 'player' }).expect(201);
      expect(created.body).toMatchObject({ requiresApproval: true, canRevoke: true });

      const unapproved = await createAs(coach, { role: 'player', requiresApproval: false });
      expect(unapproved.status).toBe(422);
      expect(unapproved.body).toMatchObject({ code: 'INVITE_LINK_APPROVAL_REQUIRED' });
      await createAs(coach, { role: 'coach' }).expect(403);
    });

    it('refuses staff links without approval (BR-CLUB-08)', async () => {
      const response = await createAs(actor('owner'), { role: 'coach', requiresApproval: false });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });

    it.each<Exclude<CastActor, 'anonymous'>>(['player', 'dtOfOtherCategory', 'formerPlayer'])(
      'answers 403 to the %s',
      async (name) => {
        await createAs(actor(name), { role: 'player' }).expect(403);
      },
    );

    it.each<Exclude<CastActor, 'anonymous'>>(['removedMember', 'otherClubMember'])(
      'answers 404 to the %s',
      async (name) => {
        await createAs(actor(name), { role: 'player' }).expect(404);
      },
    );
  });

  describe('PATCH /v1/clubs/:clubId/categories/:categoryId/invite-links/:linkId', () => {
    it('lets Club Admins and DTs turn approval off and on for player links', async () => {
      const link = await defaultLink();

      const off = await as(app, actor('dtOfCategory'))
        .patch(linkPath(link.id))
        .send({ requiresApproval: false })
        .expect(200);
      expect(off.body).toMatchObject({ id: link.id, requiresApproval: false });

      const on = await as(app, actor('adminOnly'))
        .patch(linkPath(link.id))
        .send({ requiresApproval: true })
        .expect(200);
      expect(on.body).toMatchObject({ id: link.id, requiresApproval: true });
    });

    it('never changes approval on staff links or for Coaches (BR-CLUB-08)', async () => {
      const coachLink = await createdBy(actor('owner'), { role: 'coach' });
      await as(app, actor('owner'))
        .patch(linkPath(coachLink.id))
        .send({ requiresApproval: false })
        .expect(403);

      const own = await createdBy(actor('coachOfCategory'), { role: 'player' });
      await as(app, actor('coachOfCategory'))
        .patch(linkPath(own.id))
        .send({ requiresApproval: false })
        .expect(403);
    });

    it('answers 404 for a revoked link or a link of another category', async () => {
      const link = await createdBy(actor('owner'), { role: 'player' });
      await as(app, actor('owner'))
        .patch(linkPath(link.id, cast.otherCategory.id))
        .send({ requiresApproval: false })
        .expect(404);

      await as(app, actor('owner')).delete(linkPath(link.id)).expect(204);
      await as(app, actor('owner'))
        .patch(linkPath(link.id))
        .send({ requiresApproval: false })
        .expect(404);
    });
  });

  describe('DELETE /v1/clubs/:clubId/categories/:categoryId/invite-links/:linkId', () => {
    it('revokes a link immediately', async () => {
      const link = await createdBy(actor('dtOfCategory'), { role: 'player' });

      await as(app, actor('dtOfCategory')).delete(linkPath(link.id)).expect(204);

      await expect(
        db.inviteLink.findUniqueOrThrow({ where: { id: link.id } }),
      ).resolves.toMatchObject({ revokedAt: NOW, updatedBy: actor('dtOfCategory').userId });
      await as(app, actor('dtOfCategory')).delete(linkPath(link.id)).expect(404);
    });

    it('lets Coaches revoke only their own links', async () => {
      const coach = actor('coachOfCategory');
      const own = await createdBy(coach, { role: 'player' });
      const others = await createdBy(actor('dtOfCategory'), { role: 'player' });

      await as(app, coach).delete(linkPath(others.id)).expect(403);
      await as(app, coach)
        .delete(linkPath((await defaultLink()).id))
        .expect(403);
      await as(app, coach).delete(linkPath(own.id)).expect(204);
    });

    it('stops DTs revoking DT links, which they cannot create', async () => {
      const dtLink = await createdBy(actor('owner'), { role: 'dt' });

      await as(app, actor('dtOfCategory')).delete(linkPath(dtLink.id)).expect(403);
    });

    it.each<Exclude<CastActor, 'anonymous'>>(['removedMember', 'otherClubMember'])(
      'answers 404 to the %s',
      async (name) => {
        const link = await createdBy(actor('owner'), { role: 'player' });
        await as(app, actor(name)).delete(linkPath(link.id)).expect(404);
      },
    );
  });

  describe('GET /v1/public/invites/:token (BR-AUTH-09)', () => {
    it('shows the club, category and role without sign-in, and nothing personal', async () => {
      const link = await createdBy(actor('owner'), { role: 'coach' });

      const response = await preview(link.token).expect(200);

      expect(response.body).toEqual({
        status: 'active',
        role: 'coach',
        club: {
          name: expect.any(String) as string,
          shortName: null,
          primaryColor: null,
          crest: null,
        },
        category: { name: 'Primera', format: 'f11' },
      });
    });

    it('reports expired, used-up and revoked links (BR-AUTH-10)', async () => {
      const owner = actor('owner');
      const expiring = await createdBy(owner, { role: 'player', expiresInDays: 1 });
      const usedUp = await createdBy(owner, { role: 'player', maxUses: 1 });
      await db.inviteLink.update({ where: { id: usedUp.id }, data: { usesCount: 1 } });
      const revoked = await createdBy(owner, { role: 'player' });
      await as(app, owner).delete(linkPath(revoked.id)).expect(204);
      clock.advance(DAY_MS);

      const statusOf = async (token: string) =>
        ((await preview(token).expect(200)).body as InvitePreview).status;
      expect(await statusOf(expiring.token)).toBe('expired');
      expect(await statusOf(usedUp.token)).toBe('used_up');
      expect(await statusOf(revoked.token)).toBe('revoked');
    });

    it('treats a link of an archived category as revoked', async () => {
      const link = await defaultLink();
      await db.category.update({ where: { id: cast.category.id }, data: { archivedAt: NOW } });

      expect(((await preview(link.token).expect(200)).body as InvitePreview).status).toBe(
        'revoked',
      );
    });

    it('answers 404 to unknown or malformed tokens and to deleted clubs', async () => {
      await preview('AAAAAAAAAAAAAAAAAAAAAA').expect(404);
      await preview('not-a-token').expect(404);

      const link = await defaultLink();
      await db.club.update({ where: { id: cast.club.id }, data: { deletedAt: NOW } });
      const response = await preview(link.token).expect(404);
      expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
