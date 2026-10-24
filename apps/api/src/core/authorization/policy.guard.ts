import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ClsService } from 'nestjs-cls';

import { PublicRoute } from '../auth/public.decorator.js';
import type { RequestContext } from '../request-context.js';
import {
  type Action,
  Can,
  Policies,
  type Policy,
  type PolicyMap,
  type ScopeLoader,
} from './policy.js';

export type MetadataTarget = Parameters<Reflector['get']>[1];

export function declaredPolicy(
  reflector: Reflector,
  controller: MetadataTarget,
  handler: MetadataTarget,
): Policy | undefined {
  const action = reflector.get<Action | undefined>(Can.KEY, handler);
  return action && reflector.get<PolicyMap | undefined>(Policies.KEY, controller)?.[action];
}

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly cls: ClsService<RequestContext>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();
    if (this.reflector.getAllAndOverride<true | undefined>(PublicRoute.KEY, [handler, controller]))
      return true;

    // RouteDeclarationsCheck stops the app from starting with an undeclared route; this fails closed anyway.
    const policy = declaredPolicy(this.reflector, controller, handler);
    if (!policy) throw new ForbiddenException();

    if (policy.kind === 'account') {
      const actor = this.cls.get('actor');
      if (!actor || !policy.allows(actor)) throw new ForbiddenException();
      return true;
    }

    const actor = this.cls.get('clubActor');
    if (!actor) throw new ForbiddenException();
    let scope: unknown;
    if (policy.loader) {
      const loader = this.moduleRef.get<ScopeLoader<unknown>>(policy.loader, { strict: false });
      scope = await loader.load(actor.club, context.switchToHttp().getRequest<Request>().params);
      if (scope === null) throw new NotFoundException();
    }
    if (!policy.allows(actor, scope)) throw new ForbiddenException();
    return true;
  }
}
