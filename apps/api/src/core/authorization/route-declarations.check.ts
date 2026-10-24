import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants.js';
import { DiscoveryService, MetadataScanner, ModuleRef, Reflector } from '@nestjs/core';

import { PublicRoute } from '../auth/public.decorator.js';
import { type Action, Can, type ScopeLoaderClass } from './policy.js';
import { declaredPolicy, type MetadataTarget } from './policy.guard.js';

const paths = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : [typeof value === 'string' ? value : ''];

const hasClubIdParam = (path: string) => /(^|\/):clubId(\/|$)/.test(path);

@Injectable()
export class RouteDeclarationsCheck implements OnApplicationBootstrap {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  onApplicationBootstrap(): void {
    const problems = this.discovery.getControllers().flatMap(({ instance, metatype }) => {
      if (!instance || !metatype) return [];
      const prototype = Object.getPrototypeOf(instance) as object;
      return this.scanner.getAllMethodNames(prototype).flatMap((name) => {
        const handler: unknown = Reflect.get(prototype, name);
        return typeof handler === 'function' ? this.problemsOf(metatype, handler, name) : [];
      });
    });
    if (problems.length > 0) {
      throw new Error(`Routes without a valid authorization declaration:\n${problems.join('\n')}`);
    }
  }

  private problemsOf(controller: MetadataTarget, handler: MetadataTarget, name: string): string[] {
    const handlerPaths: unknown = this.reflector.get(PATH_METADATA, handler);
    if (handlerPaths === undefined) return [];

    const route = `${controller.name}.${name}`;
    if (this.reflector.getAllAndOverride<true | undefined>(PublicRoute.KEY, [handler, controller]))
      return [];
    const action = this.reflector.get<Action | undefined>(Can.KEY, handler);
    if (!action) return [`${route} declares neither @Can() nor @Public()`];
    const policy = declaredPolicy(this.reflector, controller, handler);
    if (!policy) return [`${route} declares ${action}, which its controller's @Policies() lacks`];
    if (policy.kind === 'account') return [];

    const controllerPaths: unknown = this.reflector.get(PATH_METADATA, controller);
    const fullPaths = paths(controllerPaths).flatMap((prefix) =>
      paths(handlerPaths).map((path) => `${prefix}/${path}`),
    );
    if (!fullPaths.every(hasClubIdParam))
      return [`${route} declares the club action ${action} on a path without :clubId`];
    if (policy.loader && !this.provides(policy.loader))
      return [`${route} needs ${policy.loader.name}, which no module provides`];
    return [];
  }

  private provides(loader: ScopeLoaderClass<unknown>): boolean {
    try {
      this.moduleRef.get(loader, { strict: false });
      return true;
    } catch {
      return false;
    }
  }
}
