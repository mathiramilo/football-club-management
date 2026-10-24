import { randomBytes } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import type { PrismaService } from '../../src/core/database/prisma.service.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import {
  createCategory,
  createCategoryMembership,
  createClub,
  createMember,
  createUser,
} from './factories.js';

export interface CastMember {
  userId: string;
  clubMembershipId: string;
  token: string;
}

interface ClubRef {
  id: string;
}

const SESSION_EXPIRES_AT = new Date('2099-01-01T00:00:00Z');

// Better Auth stores session tokens in plain text (ADR-007), so a row with a known token is a real session.
export async function signInAs(db: PrismaService, userId: string): Promise<string> {
  const token = randomBytes(24).toString('base64url');
  await db.authSession.create({ data: { userId, token, expiresAt: SESSION_EXPIRES_AT } });
  return token;
}

export async function createSignedInMember(
  db: PrismaService,
  club: ClubRef,
  data: Partial<Prisma.ClubMembershipUncheckedCreateInput> = {},
): Promise<CastMember> {
  const user = await createUser(db);
  const membership = await createMember(db, club, { userId: user.id, ...data });
  return { userId: user.id, clubMembershipId: membership.id, token: await signInAs(db, user.id) };
}

export async function createCast(db: PrismaService) {
  const club = await createClub(db);
  const otherClub = await createClub(db);
  const category = await createCategory(db, club, { name: 'Primera' });
  const otherCategory = await createCategory(db, club, { name: 'Reserva' });

  const memberOf = async (
    target: typeof category,
    data: Partial<Prisma.CategoryMembershipUncheckedCreateInput>,
  ) => {
    const member = await createSignedInMember(db, club);
    await createCategoryMembership(db, target, { id: member.clubMembershipId }, data);
    return member;
  };

  const actors = {
    owner: await createSignedInMember(db, club, { isOwner: true, isAdmin: true }),
    adminOnly: await createSignedInMember(db, club, { isAdmin: true }),
    dtOfCategory: await memberOf(category, { staffRole: 'dt', isPlayer: false }),
    coachOfCategory: await memberOf(category, { staffRole: 'coach', isPlayer: false }),
    player: await memberOf(category, { isPlayer: true }),
    playerCoach: await memberOf(category, { staffRole: 'coach', isPlayer: true }),
    dtOfOtherCategory: await memberOf(otherCategory, { staffRole: 'dt', isPlayer: false }),
    playerOfOtherCategory: await memberOf(otherCategory, { isPlayer: true }),
    formerPlayer: await memberOf(category, {
      isPlayer: true,
      startsOn: new Date('2026-03-01'),
      endsOn: new Date('2026-06-30'),
    }),
    removedMember: await createSignedInMember(db, club, {
      status: 'removed',
      removedAt: new Date('2026-07-01T12:00:00Z'),
    }),
    otherClubMember: await createSignedInMember(db, otherClub, { isOwner: true, isAdmin: true }),
    anonymous: null,
  } satisfies Record<string, CastMember | null>;

  return { club, otherClub, category, otherCategory, actors };
}

export type Cast = Awaited<ReturnType<typeof createCast>>;
export type CastActor = keyof Cast['actors'];

export function as(app: INestApplication<App>, actor: CastMember | null) {
  const http = request(app.getHttpServer());
  const signed = (test: request.Test) =>
    actor ? test.set('Authorization', `Bearer ${actor.token}`) : test;
  return {
    get: (path: string) => signed(http.get(path)),
    post: (path: string) => signed(http.post(path)),
    put: (path: string) => signed(http.put(path)),
    patch: (path: string) => signed(http.patch(path)),
    delete: (path: string) => signed(http.delete(path)),
  };
}
