import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { z } from 'zod';

import type { Actor } from '../auth/actor.js';
import type { ClubContext } from '../database/club-scope.js';
import type { ClubActor } from './club-actor.js';

export type Action = `${string}.${string}.${string}`;

export type RouteParams = Request['params'];

export interface ScopeLoader<Scope> {
  load(club: ClubContext, params: RouteParams): Promise<Scope | null>;
}

// Nest's Type<T> takes any[] constructor arguments, which stops TypeScript inferring Scope for injected loaders.
export type ScopeLoaderClass<Scope> = new (...args: never[]) => ScopeLoader<Scope>;

export interface ClubPolicy<Scope = undefined> {
  readonly kind: 'club';
  readonly loader?: ScopeLoaderClass<Scope>;
  allows(actor: ClubActor, scope: Scope): boolean;
}

export interface AccountPolicy {
  readonly kind: 'account';
  allows(actor: Actor): boolean;
}

export type Policy = ClubPolicy<unknown> | AccountPolicy;

export type PolicyMap = Readonly<Record<Action, Policy>>;

export function clubPolicy<Scope>(definition: {
  loader: ScopeLoaderClass<Scope>;
  allows: (actor: ClubActor, scope: Scope) => boolean;
}): ClubPolicy<Scope>;
export function clubPolicy(definition: { allows: (actor: ClubActor) => boolean }): ClubPolicy;
export function clubPolicy<Scope>(definition: Omit<ClubPolicy<Scope>, 'kind'>): ClubPolicy<Scope> {
  return { kind: 'club', ...definition };
}

export const accountPolicy = (definition: Omit<AccountPolicy, 'kind'>): AccountPolicy => ({
  kind: 'account',
  ...definition,
});

export const Policies = Reflector.createDecorator<PolicyMap>();

export const Can = Reflector.createDecorator<Action>();

const uuid = z.uuid();

export function idParam(params: RouteParams, name: string): string | null {
  const value = params[name];
  return typeof value === 'string' && uuid.safeParse(value).success ? value : null;
}
