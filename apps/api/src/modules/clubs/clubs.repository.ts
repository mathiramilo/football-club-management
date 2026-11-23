import { Injectable } from '@nestjs/common';
import { categoryFormat, type CategoryFormat, staffRole, type StaffRole } from '@repo/contracts';

import type { ClubContext } from '../../core/database/club-scope.js';
import { PrismaService } from '../../core/database/prisma.service.js';

export interface ClubRecord {
  id: string;
  name: string;
  shortName: string | null;
  countryCode: string;
  timezone: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  crestKey: string | null;
}

export interface CategoryMembershipOfUser {
  categoryId: string;
  name: string;
  format: CategoryFormat;
  staffRole: StaffRole | null;
  isPlayer: boolean;
  startsOn: string;
  endsOn: string | null;
}

export interface ClubMembershipOfUser {
  id: string;
  isOwner: boolean;
  isAdmin: boolean;
  club: ClubRecord;
  categoryMemberships: CategoryMembershipOfUser[];
}

export interface NewClub {
  name: string;
  shortName: string | null;
  countryCode: string;
  timezone: string;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export interface NewFirstCategory {
  name: string;
  format: CategoryFormat | undefined;
  startsOn: string;
}

const clubColumns = {
  id: true,
  name: true,
  shortName: true,
  countryCode: true,
  timezone: true,
  primaryColor: true,
  secondaryColor: true,
  crestKey: true,
} as const;

const calendarDay = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class ClubsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // A club context starts here, and prisma.forClub refuses to create clubs, so every row is stamped by hand.
  async createWithOwner(
    userId: string,
    club: NewClub,
    firstCategory: NewFirstCategory | null,
  ): Promise<ClubMembershipOfUser> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.club.create({ data: club, select: clubColumns });
      const clubId = created.id;
      const membership = await tx.clubMembership.create({
        data: { clubId, userId, isOwner: true, isAdmin: true },
        select: { id: true, isOwner: true, isAdmin: true },
      });
      if (!firstCategory) return { ...membership, club: created, categoryMemberships: [] };

      const category = await tx.category.create({
        data: { clubId, name: firstCategory.name, format: firstCategory.format },
        select: { id: true, name: true, format: true },
      });
      await tx.categoryMembership.create({
        data: {
          clubId,
          categoryId: category.id,
          clubMembershipId: membership.id,
          staffRole: 'dt',
          isPlayer: false,
          startsOn: new Date(firstCategory.startsOn),
        },
      });
      return {
        ...membership,
        club: created,
        categoryMemberships: [
          {
            categoryId: category.id,
            name: category.name,
            format: categoryFormat.parse(category.format),
            staffRole: 'dt',
            isPlayer: false,
            startsOn: firstCategory.startsOn,
            endsOn: null,
          },
        ],
      };
    });
  }

  // The caller's own memberships across clubs: no single club context applies.
  async findActiveOfUser(userId: string): Promise<ClubMembershipOfUser[]> {
    const memberships = await this.prisma.clubMembership.findMany({
      where: { userId, status: 'active', club: { deletedAt: null } },
      orderBy: [{ club: { name: 'asc' } }, { clubId: 'asc' }],
      select: {
        id: true,
        isOwner: true,
        isAdmin: true,
        club: { select: clubColumns },
        categoryMemberships: {
          where: { category: { archivedAt: null } },
          orderBy: { category: { name: 'asc' } },
          select: {
            staffRole: true,
            isPlayer: true,
            startsOn: true,
            endsOn: true,
            category: { select: { id: true, name: true, format: true } },
          },
        },
      },
    });

    return memberships.map((membership) => ({
      id: membership.id,
      isOwner: membership.isOwner,
      isAdmin: membership.isAdmin,
      club: membership.club,
      categoryMemberships: membership.categoryMemberships.map((categoryMembership) => ({
        categoryId: categoryMembership.category.id,
        name: categoryMembership.category.name,
        format: categoryFormat.parse(categoryMembership.category.format),
        staffRole: staffRole.nullable().parse(categoryMembership.staffRole),
        isPlayer: categoryMembership.isPlayer,
        startsOn: calendarDay(categoryMembership.startsOn),
        endsOn: categoryMembership.endsOn && calendarDay(categoryMembership.endsOn),
      })),
    }));
  }

  async findClub(club: ClubContext): Promise<ClubRecord> {
    return this.prisma.forClub(club).club.findFirstOrThrow({ select: clubColumns });
  }

  async replaceCrestKey(
    club: ClubContext,
    crestKey: string | null,
    updatedAt: Date,
  ): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ previous: string | null }[]>`
      UPDATE clubs AS c
      SET crest_key = ${crestKey}, updated_at = ${updatedAt}
      FROM (SELECT id, crest_key FROM clubs WHERE id = ${club.clubId}::uuid FOR UPDATE) AS old
      WHERE c.id = old.id
      RETURNING old.crest_key AS previous`;
    return rows[0]?.previous ?? null;
  }
}
