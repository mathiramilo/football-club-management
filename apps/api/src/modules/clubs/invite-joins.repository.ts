import { Injectable } from '@nestjs/common';
import { inviteRole, type InviteRole } from '@repo/contracts';
import type { CategoryStanding, InviteAcceptOutcome } from '@repo/domain';

import { PrismaService } from '../../core/database/prisma.service.js';
import { Outbox } from '../../core/outbox/outbox.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { categoryMembershipStarted } from './events/category-membership-started.js';

export interface AcceptableInvite {
  id: string;
  clubId: string;
  categoryId: string;
  role: InviteRole;
  requiresApproval: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  usesCount: number;
  revokedAt: Date | null;
  clubTimezone: string;
  clubDeletedAt: Date | null;
  categoryArchivedAt: Date | null;
}

export interface RequiredProfile {
  firstName: string | null;
  lastName: string | null;
  birthdate: string | null;
}

export interface JoinDates {
  now: Date;
  today: string;
}

export type JoinDecision = InviteAcceptOutcome | 'inactive';

type Decide = (standing: CategoryStanding | null, hasPendingRequest: boolean) => JoinDecision;

const usesLink = (decision: JoinDecision) => decision === 'joined' || decision === 'requested';

// The invite is found by its token before any club context exists, and the join writes rows of the
// club it names, so these queries stamp and filter club_id themselves.
@Injectable()
export class InviteJoinsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: Outbox,
  ) {}

  async findByTokenHash(tokenHash: string): Promise<AcceptableInvite | null> {
    const row = await this.prisma.inviteLink.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        clubId: true,
        categoryId: true,
        role: true,
        requiresApproval: true,
        expiresAt: true,
        maxUses: true,
        usesCount: true,
        revokedAt: true,
        club: { select: { timezone: true, deletedAt: true } },
        category: { select: { archivedAt: true } },
      },
    });
    if (!row) return null;
    const { club, category, ...link } = row;
    return {
      ...link,
      role: inviteRole.parse(link.role),
      clubTimezone: club.timezone,
      clubDeletedAt: club.deletedAt,
      categoryArchivedAt: category.archivedAt,
    };
  }

  async findRequiredProfile(userId: string): Promise<RequiredProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { firstName: true, lastName: true, birthdate: true },
    });
    return { ...user, birthdate: user.birthdate?.toISOString().slice(0, 10) ?? null };
  }

  // One person's joins run one at a time (the user row lock), so the standing read here still holds
  // when the rows are written. The use count is guarded in the update itself, across people.
  async accept(
    invite: AcceptableInvite,
    userId: string,
    dates: JoinDates,
    decide: Decide,
  ): Promise<JoinDecision> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const standing = await this.openStanding(tx, invite, userId, dates.today);
      const pending = await tx.joinRequest.findFirst({
        where: { clubId: invite.clubId, categoryId: invite.categoryId, userId, status: 'pending' },
        select: { id: true },
      });
      const decision = decide(standing, pending !== null);
      if (!usesLink(decision)) return decision;
      if (!(await this.countUse(tx, invite, dates.now))) return 'inactive';

      if (decision === 'requested') {
        await tx.joinRequest.create({
          data: {
            clubId: invite.clubId,
            categoryId: invite.categoryId,
            inviteLinkId: invite.id,
            userId,
          },
        });
      } else {
        await this.join(tx, invite, userId, standing, dates);
      }
      return decision;
    });
  }

  private async openStanding(
    tx: Prisma.TransactionClient,
    invite: AcceptableInvite,
    userId: string,
    today: string,
  ): Promise<(CategoryStanding & { id: string }) | null> {
    return tx.categoryMembership.findFirst({
      where: {
        clubId: invite.clubId,
        categoryId: invite.categoryId,
        clubMembership: { userId, status: 'active' },
        OR: [{ endsOn: null }, { endsOn: { gte: new Date(today) } }],
      },
      orderBy: { startsOn: 'asc' },
      select: { id: true, isPlayer: true, staffRole: true },
    });
  }

  private async countUse(
    tx: Prisma.TransactionClient,
    invite: AcceptableInvite,
    now: Date,
  ): Promise<boolean> {
    const updated = await tx.$executeRaw`
      UPDATE invite_links
      SET uses_count = uses_count + 1, updated_at = ${now}
      WHERE id = ${invite.id}::uuid
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > ${now})
        AND (max_uses IS NULL OR uses_count < max_uses)`;
    return updated === 1;
  }

  // BR-CLUB-12: a removed member who joins again gets their club membership back, with its history.
  private async join(
    tx: Prisma.TransactionClient,
    invite: AcceptableInvite,
    userId: string,
    standing: { id: string } | null,
    dates: JoinDates,
  ): Promise<void> {
    const { clubId, categoryId } = invite;
    const membership = await tx.clubMembership.upsert({
      where: { clubId_userId: { clubId, userId } },
      create: { clubId, userId },
      update: { status: 'active', removedAt: null },
      select: { id: true },
    });

    const categoryMembership = standing
      ? await tx.categoryMembership.update({
          where: { id: standing.id, clubId },
          data: { isPlayer: true },
          select: { id: true, startsOn: true },
        })
      : await tx.categoryMembership.create({
          data: {
            clubId,
            categoryId,
            clubMembershipId: membership.id,
            isPlayer: true,
            startsOn: new Date(dates.today),
          },
          select: { id: true, startsOn: true },
        });

    await this.outbox.add(tx, categoryMembershipStarted, {
      clubId,
      categoryId,
      clubMembershipId: membership.id,
      categoryMembershipId: categoryMembership.id,
      startsOn: categoryMembership.startsOn.toISOString().slice(0, 10),
    });
  }
}
