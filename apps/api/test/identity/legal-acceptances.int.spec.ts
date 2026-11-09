import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Public } from '../../src/core/auth/public.decorator.js';
import { Can, clubPolicy, Policies } from '../../src/core/authorization/policy.js';
import { Clock } from '../../src/core/clock/clock.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import {
  LEGAL_DOCUMENTS,
  LEGAL_DOCUMENTS_IN_FORCE,
  type LegalDocumentVersions,
} from '../../src/modules/identity/legal-documents.js';
import { as, type CastMember, signInAs } from '../support/club-cast.js';
import { createTestApp } from '../support/create-test-app.js';
import { createClub, createUser } from '../support/factories.js';
import { FakeClock } from '../support/fake-clock.js';
import { SIGNED_IN_TEST_ACTION, signedInTestPolicies } from '../support/test-policies.js';

@Policies({ ...signedInTestPolicies, 'test.club.use': clubPolicy({ allows: () => true }) })
@Controller()
class LegalGateTestController {
  @Public()
  @Get('test/legal-gate/public')
  open() {
    return { served: true };
  }

  @Can(SIGNED_IN_TEST_ACTION)
  @Get('test/legal-gate')
  signedIn() {
    return { served: true };
  }

  @Can('test.club.use')
  @Get('clubs/:clubId/test-legal-gate')
  inClub() {
    return { served: true };
  }
}

@Module({ controllers: [LegalGateTestController] })
class LegalGateTestModule {}

const NOW = new Date('2026-11-09T15:00:00Z');
const IN_FORCE = LEGAL_DOCUMENTS_IN_FORCE.terms.version;
const NEXT = '2027-02-01';

describe('Legal documents (AUTH-04, BR-AUTH-08)', () => {
  const clock = new FakeClock(NOW);
  const inForce: Record<'terms' | 'privacy', LegalDocumentVersions> = {
    terms: { ...LEGAL_DOCUMENTS_IN_FORCE.terms },
    privacy: { ...LEGAL_DOCUMENTS_IN_FORCE.privacy },
  };
  let app: INestApplication<App>;
  let db: PrismaService;
  let newcomer: CastMember;
  let accepted: CastMember;

  const signedInUser = async (data: Parameters<typeof createUser>[1] = {}) => {
    const user = await createUser(db, data);
    return { userId: user.id, clubMembershipId: '', token: await signInAs(db, user.id) };
  };
  const accept = (actor: CastMember, documents: { document: string; version: string }[]) =>
    as(app, actor)
      .post('/v1/me/legal-acceptances')
      .set('X-Platform', 'android')
      .send({ documents });
  const acceptAll = (actor: CastMember, version = IN_FORCE) =>
    accept(actor, [
      { document: 'terms', version },
      { document: 'privacy', version },
    ]);
  const rowsOf = (userId: string) =>
    db.legalAcceptance.findMany({
      where: { userId },
      select: { document: true, version: true, acceptedAt: true, platform: true },
      orderBy: [{ document: 'asc' }, { version: 'asc' }],
    });

  beforeAll(async () => {
    app = await createTestApp(
      (builder) =>
        builder
          .overrideProvider(Clock)
          .useValue(clock)
          .overrideProvider(LEGAL_DOCUMENTS)
          .useValue(inForce),
      [LegalGateTestModule],
    );
    db = app.get(PrismaService);
  });

  beforeEach(async () => {
    clock.set(NOW);
    newcomer = await signedInUser({ legalAcceptances: undefined });
    accepted = await signedInUser();
  });

  afterEach(() => {
    inForce.terms = { ...LEGAL_DOCUMENTS_IN_FORCE.terms };
    inForce.privacy = { ...LEGAL_DOCUMENTS_IN_FORCE.privacy };
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/me/legal-documents', () => {
    it('asks a new account to accept both documents in force', async () => {
      const response = await as(app, newcomer).get('/v1/me/legal-documents').expect(200);

      expect(response.body).toEqual({
        acceptanceRequired: true,
        documents: [
          { document: 'terms', version: IN_FORCE, acceptedVersion: null, acceptanceRequired: true },
          {
            document: 'privacy',
            version: IN_FORCE,
            acceptedVersion: null,
            acceptanceRequired: true,
          },
        ],
      });
    });

    it('answers 401 without a session', async () => {
      const response = await as(app, null).get('/v1/me/legal-documents');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /v1/me/legal-acceptances', () => {
    it('records the version, time and platform of each document, then lets the user in', async () => {
      const response = await acceptAll(newcomer).expect(200);

      expect(response.body).toMatchObject({ acceptanceRequired: false });
      expect(await rowsOf(newcomer.userId)).toEqual([
        { document: 'privacy', version: new Date(IN_FORCE), acceptedAt: NOW, platform: 'android' },
        { document: 'terms', version: new Date(IN_FORCE), acceptedAt: NOW, platform: 'android' },
      ]);
      await as(app, newcomer).get('/v1/test/legal-gate').expect(200);
    });

    it('keeps the first acceptance when the same versions are sent again', async () => {
      await acceptAll(newcomer).expect(200);
      clock.advance(60_000);

      await acceptAll(newcomer).expect(200);

      const rows = await rowsOf(newcomer.userId);
      expect(rows).toHaveLength(2);
      expect(rows.map(({ acceptedAt }) => acceptedAt)).toEqual([NOW, NOW]);
    });

    it('keeps asking until every document is accepted', async () => {
      const response = await accept(newcomer, [{ document: 'terms', version: IN_FORCE }]);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        acceptanceRequired: true,
        documents: [
          { document: 'terms', acceptedVersion: IN_FORCE, acceptanceRequired: false },
          { document: 'privacy', acceptedVersion: null, acceptanceRequired: true },
        ],
      });
    });

    it('answers 409 LEGAL_DOCUMENT_OUTDATED for a version no longer in force, and records nothing', async () => {
      const response = await accept(newcomer, [
        { document: 'terms', version: IN_FORCE },
        { document: 'privacy', version: '2026-01-01' },
      ]);

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'LEGAL_DOCUMENT_OUTDATED' });
      expect(await rowsOf(newcomer.userId)).toEqual([]);
    });

    it.each([
      ['no documents', []],
      ['an unknown document', [{ document: 'club_terms', version: IN_FORCE }]],
      ['a malformed version', [{ document: 'terms', version: '9/11/2026' }]],
      [
        'the same document twice',
        [
          { document: 'terms', version: IN_FORCE },
          { document: 'terms', version: IN_FORCE },
        ],
      ],
    ])('answers 400 VALIDATION_FAILED for %s', async (_case, documents) => {
      const response = await accept(newcomer, documents);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });

    it('answers 400 without X-Platform, since the platform is part of the record', async () => {
      const response = await as(app, newcomer)
        .post('/v1/me/legal-acceptances')
        .send({ documents: [{ document: 'terms', version: IN_FORCE }] });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'BAD_REQUEST' });
      expect(await rowsOf(newcomer.userId)).toEqual([]);
    });
  });

  describe('the gate on every other signed-in route', () => {
    it('answers 403 LEGAL_ACCEPTANCE_REQUIRED until the documents are accepted', async () => {
      const response = await as(app, newcomer).get('/v1/test/legal-gate');

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: 'LEGAL_ACCEPTANCE_REQUIRED' });
      await as(app, accepted).get('/v1/test/legal-gate').expect(200);
    });

    it('answers before the club and permission checks', async () => {
      const club = await createClub(db);

      const response = await as(app, newcomer).get(`/v1/clubs/${club.id}/test-legal-gate`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: 'LEGAL_ACCEPTANCE_REQUIRED' });
      await as(app, accepted).get(`/v1/clubs/${club.id}/test-legal-gate`).expect(404);
    });

    it('leaves public routes open', async () => {
      await request(app.getHttpServer()).get('/v1/test/legal-gate/public').expect(200);
    });

    it('does not ask again after an editorial change', async () => {
      inForce.terms = { version: NEXT, minimumVersion: IN_FORCE };

      const response = await as(app, accepted).get('/v1/me/legal-documents').expect(200);

      expect(response.body).toMatchObject({
        acceptanceRequired: false,
        documents: [
          {
            document: 'terms',
            version: NEXT,
            acceptedVersion: IN_FORCE,
            acceptanceRequired: false,
          },
          { document: 'privacy', acceptanceRequired: false },
        ],
      });
      await as(app, accepted).get('/v1/test/legal-gate').expect(200);
    });

    it('asks everyone again after a material change, and lets them in once accepted', async () => {
      inForce.terms = { version: NEXT, minimumVersion: NEXT };

      const blocked = await as(app, accepted).get('/v1/test/legal-gate');
      expect(blocked.status).toBe(403);
      expect(blocked.body).toMatchObject({ code: 'LEGAL_ACCEPTANCE_REQUIRED' });

      const response = await accept(accepted, [{ document: 'terms', version: NEXT }]).expect(200);

      expect(response.body).toMatchObject({
        acceptanceRequired: false,
        documents: [{ document: 'terms', acceptedVersion: NEXT, acceptanceRequired: false }, {}],
      });
      await as(app, accepted).get('/v1/test/legal-gate').expect(200);
    });
  });
});
