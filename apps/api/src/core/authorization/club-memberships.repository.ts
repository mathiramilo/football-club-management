import { Injectable } from '@nestjs/common';
import { staffRole } from '@repo/contracts';

import type { ClubContext } from '../database/club-scope.js';
import { PrismaService } from '../database/prisma.service.js';
import type { ClubMembershipRecord } from './club-actor.js';

const calendarDay = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class ClubMembershipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(club: ClubContext, userId: string): Promise<ClubMembershipRecord | null> {
    const membership = await this.prisma.forClub(club).clubMembership.findFirst({
      where: { userId, status: 'active', club: { deletedAt: null } },
      select: {
        id: true,
        isOwner: true,
        isAdmin: true,
        club: { select: { id: true, timezone: true } },
        categoryMemberships: {
          select: {
            categoryId: true,
            staffRole: true,
            isPlayer: true,
            startsOn: true,
            endsOn: true,
          },
        },
      },
    });
    if (!membership) return null;

    return {
      id: membership.id,
      userId,
      isOwner: membership.isOwner,
      isAdmin: membership.isAdmin,
      club: { clubId: membership.club.id, timezone: membership.club.timezone },
      categoryMemberships: membership.categoryMemberships.map((categoryMembership) => ({
        categoryId: categoryMembership.categoryId,
        staffRole: staffRole.nullable().parse(categoryMembership.staffRole),
        isPlayer: categoryMembership.isPlayer,
        startsOn: calendarDay(categoryMembership.startsOn),
        endsOn: categoryMembership.endsOn && calendarDay(categoryMembership.endsOn),
      })),
    };
  }
}
