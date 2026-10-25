import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { AnyAppVersion } from '../app-config/any-app-version.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { ReadinessService } from './readiness.service.js';

@ApiExcludeController()
@Public()
@AnyAppVersion()
@Controller('health')
export class HealthController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get()
  check() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    if (!(await this.readiness.isReady())) {
      throw new ServiceUnavailableException();
    }
    return { status: 'ok' };
  }
}
