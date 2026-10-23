import { randomUUID } from 'node:crypto';

import type { PrismaService } from '../../src/core/database/prisma.service.js';
import type { Prisma } from '../../src/generated/prisma/client.js';

interface ClubRef {
  id: string;
}

interface ClubScopedRef {
  id: string;
  clubId: string;
}

const uniqueSuffix = () => randomUUID().slice(0, 8);

export function createUser(db: PrismaService, data: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  return db.user.create({
    data: {
      email: `jugador-${uniqueSuffix()}@example.test`,
      firstName: 'Lucía',
      lastName: 'Prueba',
      birthdate: new Date('2001-05-10'),
      ...data,
    },
  });
}

export function createClub(db: PrismaService, data: Partial<Prisma.ClubUncheckedCreateInput> = {}) {
  return db.club.create({
    data: {
      name: `Club Atlético ${uniqueSuffix()}`,
      countryCode: 'UY',
      timezone: 'America/Montevideo',
      ...data,
    },
  });
}

export function createCategory(
  db: PrismaService,
  club: ClubRef,
  data: Partial<Prisma.CategoryUncheckedCreateInput> = {},
) {
  return db.category.create({
    data: { clubId: club.id, name: `Categoría ${uniqueSuffix()}`, ...data },
  });
}

export function createMember(
  db: PrismaService,
  club: ClubRef,
  data: Partial<Prisma.ClubMembershipUncheckedCreateInput> = {},
) {
  return db.clubMembership.create({
    data: { clubId: club.id, managedFirstName: 'Juan', managedLastName: 'Prueba', ...data },
  });
}

export function createCategoryMembership(
  db: PrismaService,
  category: ClubScopedRef,
  member: ClubRef,
  data: Partial<Prisma.CategoryMembershipUncheckedCreateInput> = {},
) {
  return db.categoryMembership.create({
    data: {
      clubId: category.clubId,
      categoryId: category.id,
      clubMembershipId: member.id,
      isPlayer: true,
      startsOn: new Date('2026-03-01'),
      ...data,
    },
  });
}

export function createEvent(
  db: PrismaService,
  club: ClubRef,
  data: Partial<Prisma.EventUncheckedCreateInput> = {},
) {
  return db.event.create({
    data: {
      clubId: club.id,
      type: 'practice',
      startsAt: new Date('2026-11-02T22:00:00Z'),
      endsAt: new Date('2026-11-02T23:30:00Z'),
      rsvpDeadlineAt: new Date('2026-11-02T20:00:00Z'),
      shareToken: randomUUID(),
      ...data,
    },
  });
}

export function createInvitee(
  db: PrismaService,
  event: ClubScopedRef,
  member: ClubRef,
  data: Partial<Prisma.EventInviteeUncheckedCreateInput> = {},
) {
  return db.eventInvitee.create({
    data: {
      clubId: event.clubId,
      eventId: event.id,
      clubMembershipId: member.id,
      source: 'category',
      ...data,
    },
  });
}
