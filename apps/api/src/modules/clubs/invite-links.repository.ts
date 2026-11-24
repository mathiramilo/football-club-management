import { Injectable } from '@nestjs/common';
import { categoryFormat, type CategoryFormat, inviteRole, type InviteRole } from '@repo/contracts';
import { v7 as uuidv7 } from 'uuid';

import type { ClubContext } from '../../core/database/club-scope.js';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { InviteTokens } from './invite-tokens.js';

export interface InviteLinkRecord {
  id: string;
  categoryId: string;
  role: InviteRole;
  isDefault: boolean;
  requiresApproval: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  usesCount: number;
  revokedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface NewInviteLink {
  categoryId: string;
  role: InviteRole;
  requiresApproval: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  createdBy: string;
}

export interface InvitePreviewRecord extends InviteLinkRecord {
  club: {
    name: string;
    shortName: string | null;
    primaryColor: string | null;
    crestKey: string | null;
  };
  category: { name: string; format: CategoryFormat; archivedAt: Date | null };
  clubDeletedAt: Date | null;
}

const CODE_ATTEMPTS = 5;

const linkColumns = {
  id: true,
  categoryId: true,
  role: true,
  isDefault: true,
  requiresApproval: true,
  expiresAt: true,
  maxUses: true,
  usesCount: true,
  revokedAt: true,
  createdBy: true,
  createdAt: true,
} as const;

const toRecord = <Row extends { role: string }>(row: Row) => ({
  ...row,
  role: inviteRole.parse(row.role),
});

// A fresh id and the token derived from it can't collide, so a unique violation here is the code.
const isCodeCollision = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

@Injectable()
export class InviteLinksRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: InviteTokens,
  ) {}

  async findActiveCategory(club: ClubContext, categoryId: string): Promise<{ id: string } | null> {
    return this.prisma
      .forClub(club)
      .category.findFirst({ where: { id: categoryId, archivedAt: null }, select: { id: true } });
  }

  async findUnrevoked(
    club: ClubContext,
    categoryId: string,
    linkId: string,
  ): Promise<InviteLinkRecord | null> {
    const row = await this.prisma.forClub(club).inviteLink.findFirst({
      where: { id: linkId, categoryId, revokedAt: null, category: { archivedAt: null } },
      select: linkColumns,
    });
    return row && toRecord(row);
  }

  async listUnrevoked(club: ClubContext, categoryId: string): Promise<InviteLinkRecord[]> {
    const rows = await this.prisma.forClub(club).inviteLink.findMany({
      where: { categoryId, revokedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      select: linkColumns,
    });
    return rows.map(toRecord);
  }

  async create(club: ClubContext, link: NewInviteLink): Promise<InviteLinkRecord> {
    for (let attempt = 1; ; attempt++) {
      const id = uuidv7();
      try {
        const row = await this.prisma.forClub(club).inviteLink.create({
          data: {
            ...link,
            id,
            clubId: club.clubId,
            tokenHash: this.tokens.hashOf(this.tokens.tokenOf(id)),
            code: this.tokens.newCode(),
          },
          select: linkColumns,
        });
        return toRecord(row);
      } catch (error) {
        if (!isCodeCollision(error) || attempt >= CODE_ATTEMPTS) throw error;
      }
    }
  }

  // CLUB-05: every category has an open default player link. It also runs inside club creation, before
  // a club context exists, so it takes a plain transaction and stamps and filters club_id itself.
  async ensureDefault(
    tx: Prisma.TransactionClient,
    club: ClubContext,
    categoryId: string,
    requiresApproval: boolean,
  ): Promise<void> {
    const openDefault = { clubId: club.clubId, categoryId, isDefault: true, revokedAt: null };
    for (let attempt = 1; attempt <= CODE_ATTEMPTS; attempt++) {
      const id = uuidv7();
      await tx.inviteLink.createMany({
        data: [
          {
            id,
            clubId: club.clubId,
            categoryId,
            role: 'player',
            isDefault: true,
            tokenHash: this.tokens.hashOf(this.tokens.tokenOf(id)),
            code: this.tokens.newCode(),
            requiresApproval,
          },
        ],
        skipDuplicates: true,
      });
      if (await tx.inviteLink.findFirst({ where: openDefault, select: { id: true } })) return;
    }
    throw new Error('Could not create a default invite link with a unique code');
  }

  async ensureDefaultFor(club: ClubContext, categoryId: string): Promise<void> {
    await this.ensureDefault(this.prisma, club, categoryId, true);
  }

  // CLUB-05: revoking the default link immediately creates a new one with the same approval setting.
  async revoke(club: ClubContext, link: InviteLinkRecord, by: string, now: Date): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.inviteLink.updateMany({
        where: { id: link.id, clubId: club.clubId, revokedAt: null },
        data: { revokedAt: now, updatedBy: by, updatedAt: now },
      });
      if (link.isDefault)
        await this.ensureDefault(tx, club, link.categoryId, link.requiresApproval);
    });
  }

  async updateApproval(
    club: ClubContext,
    linkId: string,
    requiresApproval: boolean,
    by: string,
  ): Promise<InviteLinkRecord> {
    const row = await this.prisma.forClub(club).inviteLink.update({
      where: { id: linkId },
      data: { requiresApproval, updatedBy: by },
      select: linkColumns,
    });
    return toRecord(row);
  }

  async findPreview(tokenHash: string): Promise<InvitePreviewRecord | null> {
    const row = await this.prisma.inviteLink.findUnique({
      where: { tokenHash },
      select: {
        ...linkColumns,
        club: {
          select: {
            name: true,
            shortName: true,
            primaryColor: true,
            crestKey: true,
            deletedAt: true,
          },
        },
        category: { select: { name: true, format: true, archivedAt: true } },
      },
    });
    if (!row) return null;
    const { club, category, ...link } = row;
    const { deletedAt, ...clubFields } = club;
    return {
      ...toRecord(link),
      club: clubFields,
      clubDeletedAt: deletedAt,
      category: { ...category, format: categoryFormat.parse(category.format) },
    };
  }
}
