import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { expectViolation } from '../support/constraints.js';
import { createUser } from '../support/factories.js';

describe('Auth schema invariants (TECH-04, ADR-007)', () => {
  let db: PrismaService;

  beforeAll(() => {
    db = new PrismaService(inject('databaseUrl'));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('links a provider account to one user only (BR-AUTH-01)', async () => {
    const user = await createUser(db);
    const other = await createUser(db);
    await db.authIdentity.create({
      data: { userId: user.id, provider: 'google', providerSubject: 'google-sub-1' },
    });

    await expectViolation(
      db.authIdentity.create({
        data: { userId: other.id, provider: 'google', providerSubject: 'google-sub-1' },
      }),
      'auth_identities_provider_provider_subject_key',
    );
  });

  it('accepts only Google and Apple identities', async () => {
    const user = await createUser(db);

    await expectViolation(
      db.authIdentity.create({
        data: { userId: user.id, provider: 'facebook', providerSubject: 'fb-1' },
      }),
      'auth_identities_provider_check',
    );
  });

  it('never stores provider tokens or passwords', async () => {
    const user = await createUser(db);

    await expectViolation(
      db.authIdentity.create({
        data: { userId: user.id, provider: 'apple', providerSubject: 'apple-1', idToken: 'eyJ…' },
      }),
      'auth_identities_no_provider_secrets_check',
    );
  });

  it("removes a user's sessions and identities with the user", async () => {
    const user = await createUser(db);
    await db.authIdentity.create({
      data: { userId: user.id, provider: 'apple', providerSubject: `apple-${user.id}` },
    });
    await db.authSession.create({
      data: { userId: user.id, token: `token-${user.id}`, expiresAt: new Date('2027-01-01') },
    });

    await db.user.delete({ where: { id: user.id } });

    expect(await db.authIdentity.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.authSession.count({ where: { userId: user.id } })).toBe(0);
  });
});
