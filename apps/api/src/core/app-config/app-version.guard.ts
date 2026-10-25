import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { clientInfoFrom } from '../client/client-info.js';
import { DomainError } from '../errors/domain-error.js';
import { AnyAppVersion } from './any-app-version.decorator.js';
import { AppConfigService } from './app-config.service.js';

@Injectable()
export class AppVersionGuard implements CanActivate {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const acceptsAnyVersion = this.reflector.getAllAndOverride<true | undefined>(
      AnyAppVersion.KEY,
      [context.getHandler(), context.getClass()],
    );
    if (acceptsAnyVersion) return true;

    const { headers } = context.switchToHttp().getRequest<Request>();
    if (await this.appConfig.isOutdated(clientInfoFrom(headers)))
      throw new DomainError('APP_UPDATE_REQUIRED');
    return true;
  }
}
