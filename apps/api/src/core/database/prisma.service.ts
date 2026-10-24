import type { OnApplicationShutdown } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client.js';
import { type ClubContext, clubScope } from './club-scope.js';

export class PrismaService extends PrismaClient implements OnApplicationShutdown {
  constructor(databaseUrl: string) {
    // node-postgres waits forever for a connection by default; Prisma's own engine used to give up after 5 s.
    super({
      adapter: new PrismaPg({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 }),
    });
  }

  forClub(club: ClubContext) {
    return this.$extends(clubScope(club));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect();
  }
}
