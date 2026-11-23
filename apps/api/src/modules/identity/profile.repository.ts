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
}
