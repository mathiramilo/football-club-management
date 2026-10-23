import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';

import type { RequestContext } from './actor.js';
import { AUTH } from './auth.tokens.js';
import type { Auth } from './create-auth.js';
import { Public } from './public.decorator.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    private readonly reflector: Reflector,
    private readonly cls: ClsService<RequestContext>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<true | undefined>(Public.KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const http = context.switchToHttp();
    const { headers, response: session } = await this.auth.api.getSession({
      headers: fromNodeHeaders(http.getRequest<Request>().headers),
      returnHeaders: true,
    });
    if (!session) throw new UnauthorizedException();

    // Keeps the web cookie's expiry sliding with the session (BR-AUTH-04).
    const refreshedCookies = headers.getSetCookie();
    if (refreshedCookies.length > 0)
      http.getResponse<Response>().append('Set-Cookie', refreshedCookies);

    this.cls.set('actor', { userId: session.user.id, sessionId: session.session.id });
    return true;
  }
}
