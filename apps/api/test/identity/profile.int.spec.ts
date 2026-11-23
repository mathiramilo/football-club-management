import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Analytics } from '../../src/core/analytics/analytics.js';
import { Clock } from '../../src/core/clock/clock.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import { as, type CastMember, signInAs } from '../support/club-cast.js';
import { createTestApp } from '../support/create-test-app.js';
import { FakeAnalytics } from '../support/fake-analytics.js';
import { createUser } from '../support/factories.js';
import { FakeClock } from '../support/fake-clock.js';

const NOW = new Date('2026-11-22T15:00:00Z');

const completeProfile = {
  firstName: 'Nicolás',
  lastName: 'Pérez',
  birthdate: '1999-04-12',
};

describe('/v1/me profile (AUTH-05)', () => {
  const clock = new FakeClock(NOW);
  const analytics = new FakeAnalytics();
  let app: INestApplication<App>;
  let db: PrismaService;
  let newcomer: CastMember;

  const signedInUser = async (data: Parameters<typeof createUser>[1] = {}) => {
    const user = await createUser(db, data);
    return { userId: user.id, clubMembershipId: '', token: await signInAs(db, user.id) };
  };
  const newUser = (data: Parameters<typeof createUser>[1] = {}) =>
    signedInUser({ firstName: null, lastName: null, birthdate: null, ...data });
  const patch = (actor: CastMember, body: object) => as(app, actor).patch('/v1/me').send(body);
  const storedProfileOf = (userId: string) =>
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { firstName: true, lastName: true, nickname: true, birthdate: true },
    });
  const completions = () => analytics.captured.filter(({ event }) => event === 'profile_completed');

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
    newcomer = await newUser({ name: 'Nicolás Pérez' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/me', () => {
    it('shows an incomplete profile with the name from sign-in as a suggestion', async () => {
      const { email } = await db.user.findUniqueOrThrow({ where: { id: newcomer.userId } });

      const response = await as(app, newcomer).get('/v1/me').expect(200);

      expect(response.body).toEqual({
        id: newcomer.userId,
        email,
        firstName: null,
        lastName: null,
        nickname: null,
        birthdate: null,
        displayName: null,
        isMinor: null,
        profileComplete: false,
        photo: null,
        suggestedName: { firstName: 'Nicolás', lastName: 'Pérez' },
      });
    });

    it('suggests no name after an email-code sign-up', async () => {
      const user = await newUser({ name: '' });

      const response = await as(app, user).get('/v1/me').expect(200);

      expect(response.body).toMatchObject({ suggestedName: null });
    });

    it('shows a complete profile with its display name (BR-AUTH-07)', async () => {
      const user = await signedInUser({ ...completeProfile, birthdate: new Date('1999-04-12') });

      const response = await as(app, user).get('/v1/me').expect(200);

      expect(response.body).toMatchObject({
        ...completeProfile,
        displayName: 'Nicolás P.',
        isMinor: false,
        profileComplete: true,
      });
    });

    it('answers 401 without a session', async () => {
      const response = await as(app, null).get('/v1/me');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ code: 'UNAUTHENTICATED' });
    });

    it('answers 403 LEGAL_ACCEPTANCE_REQUIRED before the terms are accepted (BR-AUTH-08)', async () => {
      const user = await newUser({ legalAcceptances: undefined });

      const response = await as(app, user).get('/v1/me');

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: 'LEGAL_ACCEPTANCE_REQUIRED' });
    });
  });

  describe('PATCH /v1/me', () => {
    it('completes the profile with names, birthdate and nickname', async () => {
      const response = await patch(newcomer, { ...completeProfile, nickname: 'Nico' }).expect(200);

      expect(response.body).toMatchObject({
        ...completeProfile,
        nickname: 'Nico',
        displayName: 'Nico',
        isMinor: false,
        profileComplete: true,
      });
      expect(await storedProfileOf(newcomer.userId)).toEqual({
        firstName: 'Nicolás',
        lastName: 'Pérez',
        nickname: 'Nico',
        birthdate: new Date('1999-04-12'),
      });
    });

    it('sends profile_completed once, when the profile becomes complete', async () => {
      await patch(newcomer, { firstName: 'Nicolás', lastName: 'Pérez' }).expect(200);
      expect(completions()).toEqual([]);

      await patch(newcomer, { birthdate: '1999-04-12' }).expect(200);
      await patch(newcomer, { nickname: 'Nico' }).expect(200);

      expect(completions()).toEqual([
        { userId: newcomer.userId, event: 'profile_completed', properties: { is_minor: false } },
      ]);
    });

    it('trims names and stores an empty nickname as none', async () => {
      const response = await patch(newcomer, {
        ...completeProfile,
        firstName: '  Nicolás ',
        nickname: '   ',
      }).expect(200);

      expect(response.body).toMatchObject({
        firstName: 'Nicolás',
        nickname: null,
        displayName: 'Nicolás P.',
      });
    });

    it('removes the nickname with null', async () => {
      await patch(newcomer, { ...completeProfile, nickname: 'Nico' }).expect(200);

      const response = await patch(newcomer, { nickname: null }).expect(200);

      expect(response.body).toMatchObject({ nickname: null, displayName: 'Nicolás P.' });
    });

    it('changes only the caller’s own profile', async () => {
      const other = await newUser();

      await patch(newcomer, completeProfile).expect(200);

      expect(await storedProfileOf(other.userId)).toEqual({
        firstName: null,
        lastName: null,
        nickname: null,
        birthdate: null,
      });
    });

    describe('age (BR-AUTH-05)', () => {
      it('flags a 16-year-old as a minor from the 16th birthday', async () => {
        const response = await patch(newcomer, { ...completeProfile, birthdate: '2010-11-22' });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ isMinor: true, profileComplete: true });
        expect(completions()).toEqual([
          expect.objectContaining({ properties: { is_minor: true } }),
        ]);
      });

      it('stops flagging the user as a minor from the 18th birthday', async () => {
        const response = await patch(newcomer, { ...completeProfile, birthdate: '2008-11-22' });

        expect(response.body).toMatchObject({ isMinor: false });
      });

      it('answers 422 UNDER_MINIMUM_AGE the day before the 16th birthday, and saves nothing', async () => {
        const response = await patch(newcomer, { ...completeProfile, birthdate: '2010-11-23' });

        expect(response.status).toBe(422);
        expect(response.body).toMatchObject({ code: 'UNDER_MINIMUM_AGE' });
        expect(await storedProfileOf(newcomer.userId)).toEqual({
          firstName: null,
          lastName: null,
          nickname: null,
          birthdate: null,
        });
        expect(completions()).toEqual([]);
      });

      it('answers 422 UNDER_MINIMUM_AGE for a birthdate in the future', async () => {
        const response = await patch(newcomer, { ...completeProfile, birthdate: '2027-01-01' });

        expect(response.status).toBe(422);
        expect(response.body).toMatchObject({ code: 'UNDER_MINIMUM_AGE' });
      });

      it('counts the day in Uruguay, not in UTC', async () => {
        clock.set(new Date('2026-11-23T02:00:00Z'));

        const response = await patch(newcomer, { ...completeProfile, birthdate: '2010-11-23' });

        expect(response.status).toBe(422);
        expect(response.body).toMatchObject({ code: 'UNDER_MINIMUM_AGE' });
      });
    });

    describe('birthdate changes (F01 § 5)', () => {
      it('answers 409 BIRTHDATE_LOCKED for a new birthdate after the first save, and saves nothing', async () => {
        await patch(newcomer, completeProfile).expect(200);

        const response = await patch(newcomer, { nickname: 'Nico', birthdate: '1990-01-01' });

        expect(response.status).toBe(409);
        expect(response.body).toMatchObject({ code: 'BIRTHDATE_LOCKED' });
        expect(await storedProfileOf(newcomer.userId)).toMatchObject({
          nickname: null,
          birthdate: new Date('1999-04-12'),
        });
      });

      it('accepts the same birthdate again', async () => {
        await patch(newcomer, completeProfile).expect(200);

        await patch(newcomer, { ...completeProfile, nickname: 'Nico' }).expect(200);
      });

      it('lets only the first of two concurrent first saves set the birthdate', async () => {
        const responses = await Promise.all([
          patch(newcomer, { birthdate: '1999-04-12' }),
          patch(newcomer, { birthdate: '1990-01-01' }),
        ]);

        expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
      });
    });

    it.each([
      ['an empty first name', { firstName: '' }],
      ['a blank last name', { lastName: '   ' }],
      ['a null first name', { firstName: null }],
      ['a first name over 50 characters', { firstName: 'a'.repeat(51) }],
      ['a nickname over 30 characters', { nickname: 'a'.repeat(31) }],
      ['a malformed birthdate', { birthdate: '12/04/1999' }],
      ['an impossible birthdate', { birthdate: '1999-02-30' }],
      ['a null birthdate', { birthdate: null }],
    ])('answers 400 VALIDATION_FAILED for %s', async (_case, body) => {
      const response = await patch(newcomer, body);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });

    it('answers 401 without a session', async () => {
      const response = await as(app, null).patch('/v1/me').send(completeProfile);

      expect(response.status).toBe(401);
    });
  });
});
