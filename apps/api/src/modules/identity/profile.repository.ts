import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../core/database/prisma.service.js';

export interface ProfileRecord {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  birthdate: string | null;
  photoKey: string | null;
}

export interface ProfileChanges {
  firstName?: string;
  lastName?: string;
  nickname?: string | null;
  birthdate?: string;
}

const profileColumns = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  nickname: true,
  birthdate: true,
  photoKey: true,
} as const;

const isoDateOf = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(userId: string): Promise<ProfileRecord> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: profileColumns,
    });
    return { ...user, birthdate: user.birthdate && isoDateOf(user.birthdate) };
  }

  async update(userId: string, { birthdate, ...changes }: ProfileChanges): Promise<boolean> {
    const { count } = await this.prisma.user.updateMany({
      where: birthdate
        ? { id: userId, OR: [{ birthdate: null }, { birthdate: new Date(birthdate) }] }
        : { id: userId },
      data: { ...changes, ...(birthdate && { birthdate: new Date(birthdate) }) },
    });
    return count === 1;
  }

  async replacePhotoKey(
    userId: string,
    photoKey: string | null,
    updatedAt: Date,
  ): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ previous: string | null }[]>`
      UPDATE users AS u
      SET photo_key = ${photoKey}, updated_at = ${updatedAt}
      FROM (SELECT id, photo_key FROM users WHERE id = ${userId}::uuid FOR UPDATE) AS old
      WHERE u.id = old.id
      RETURNING old.photo_key AS previous`;
    return rows[0]?.previous ?? null;
  }
}
