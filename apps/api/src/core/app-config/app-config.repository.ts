import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class AppConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.appConfig.findMany({
      select: { platform: true, minimumVersion: true, storeUrl: true },
    });
  }
}
