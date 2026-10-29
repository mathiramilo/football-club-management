import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';

import type { Env } from '../config/env.js';
import type { RequestContext } from '../request-context.js';
import { AUTH } from './auth.tokens.js';
import type { Auth } from './create-auth.js';
import { PublicRoute } from './public.decorator.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const isCookieWrite = (request: Request) =>
  !SAFE_METHODS.has(request.method) && request.headers.authorization === undefined;

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly webOrigins: Set<string>;

  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    private readonly reflector: Reflector,
    private readonly cls: ClsService<RequestContext>,
    config: ConfigService<Env, true>,
  ) {
    this.webOrigins = new Set(config.get('WEB_ORIGINS', { infer: true }));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<true | undefined>(PublicRoute.KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const { headers, response: session } = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
      returnHeaders: true,
    });
    if (!session) throw new UnauthorizedException();
    // Same-site form posts carry the cookie without a CORS preflight; Better Auth checks its routes alike.
    if (isCookieWrite(request) && !this.webOrigins.has(request.headers.origin ?? '')) {
      throw new ForbiddenException();
    }

    // Keeps the web cookie's expiry sliding with the session (BR-AUTH-04).
    const refreshedCookies = headers.getSetCookie();
    if (refreshedCookies.length > 0)
      http.getResponse<Response>().append('Set-Cookie', refreshedCookies);

    this.cls.set('actor', { userId: session.user.id, sessionId: session.session.id });
    return true;
  }
}
