import type { BeforeApplicationShutdown } from '@nestjs/common';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

@Controller('health')
export class HealthController implements BeforeApplicationShutdown {
  private draining = false;

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    if (this.draining || !(await this.prisma.isReachable())) {
      throw new ServiceUnavailableException();
    }
    return { status: 'ok' };
  }

  beforeApplicationShutdown(): void {
    this.draining = true;
  }
}
