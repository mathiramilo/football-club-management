import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AppConfigResponse, appConfigResponse } from '@repo/contracts';
import { ClsService } from 'nestjs-cls';

import { Public } from '../auth/public.decorator.js';
import { ResponseSchema } from '../contract/response-schema.decorator.js';
import type { RequestContext } from '../request-context.js';
import { AnyAppVersion } from './any-app-version.decorator.js';
import { AppConfigService } from './app-config.service.js';

// An outdated app must still reach this route to learn that it has to update and where.
@ApiTags('platform')
@Public()
@AnyAppVersion()
@Controller('app-config')
export class AppConfigController {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly cls: ClsService<RequestContext>,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ResponseSchema(appConfigResponse)
  get(): Promise<AppConfigResponse> {
    return this.appConfig.forClient(this.cls.get('client'));
  }
}
