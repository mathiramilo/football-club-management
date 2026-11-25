import { Injectable } from '@nestjs/common';
import type { CategoryManager } from '@repo/domain';

import type { ClubActor } from '../../core/authorization/club-actor.js';
import { idParam, type RouteParams, type ScopeLoader } from '../../core/authorization/policy.js';
import type { ClubContext } from '../../core/database/club-scope.js';
import { type InviteLinkRecord, InviteLinksRepository } from './invite-links.repository.js';

export interface CategoryScope {
  id: string;
}

export const categoryManager = (actor: ClubActor, categoryId: string): CategoryManager => ({
  userId: actor.userId,
  isAdmin: actor.isAdmin,
  staffRole:
    actor.categories.find((category) => category.categoryId === categoryId)?.staffRole ?? null,
});

@Injectable()
export class InviteCategoryLoader implements ScopeLoader<CategoryScope> {
  constructor(private readonly repository: InviteLinksRepository) {}

  load(club: ClubContext, params: RouteParams): Promise<CategoryScope | null> {
    const categoryId = idParam(params, 'categoryId');
    return categoryId
      ? this.repository.findActiveCategory(club, categoryId)
      : Promise.resolve(null);
  }
}

@Injectable()
export class InviteLinkLoader implements ScopeLoader<InviteLinkRecord> {
  constructor(private readonly repository: InviteLinksRepository) {}

  load(club: ClubContext, params: RouteParams): Promise<InviteLinkRecord | null> {
    const categoryId = idParam(params, 'categoryId');
    const linkId = idParam(params, 'linkId');
    return categoryId && linkId
      ? this.repository.findUnrevoked(club, categoryId, linkId)
      : Promise.resolve(null);
  }
}
