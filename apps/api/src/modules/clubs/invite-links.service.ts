import { Injectable } from '@nestjs/common';
import {
  type CreateInviteLinkBody,
  INVITE_LINK_DEFAULT_EXPIRY_DAYS,
  type InviteLink,
  type InviteLinksResponse,
  type InvitePreview,
} from '@repo/contracts';
import {
  canSeeInviteLink,
  creatableInviteRoles,
  inviteApprovalRequired,
  inviteLinkStatus,
} from '@repo/domain';
import { addHours } from 'date-fns';

import { Analytics } from '../../core/analytics/analytics.js';
import type { ClubActor } from '../../core/authorization/club-actor.js';
import { Clock } from '../../core/clock/clock.js';
import { DomainError } from '../../core/errors/domain-error.js';
import { SquareImages } from '../media/square-images.js';
import { categoryManager } from './invite-link-scopes.js';
import { type InviteLinkRecord, InviteLinksRepository } from './invite-links.repository.js';
import { serializeInviteLink, serializeInvitePreview } from './invite-links.serializer.js';
import { InviteTokens } from './invite-tokens.js';

@Injectable()
export class InviteLinksService {
  constructor(
    private readonly repository: InviteLinksRepository,
    private readonly tokens: InviteTokens,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
    private readonly images: SquareImages,
  ) {}

  async list(actor: ClubActor, categoryId: string): Promise<InviteLinksResponse> {
    const now = this.clock.now();
    const manager = categoryManager(actor, categoryId);
    await this.repository.ensureDefaultFor(actor.club, categoryId);
    const links = await this.repository.listUnrevoked(actor.club, categoryId);
    return {
      items: links
        .filter(
          (link) => inviteLinkStatus(link, now) === 'active' && canSeeInviteLink(manager, link),
        )
        .map((link) => this.serialize(link, actor)),
    };
  }

  async create(
    actor: ClubActor,
    categoryId: string,
    body: CreateInviteLinkBody,
  ): Promise<InviteLink> {
    const manager = categoryManager(actor, categoryId);
    if (!creatableInviteRoles(manager).includes(body.role)) throw new DomainError('FORBIDDEN');
    const requiresApproval = body.requiresApproval ?? true;
    if (!requiresApproval && inviteApprovalRequired(manager, body.role))
      throw new DomainError('INVITE_LINK_APPROVAL_REQUIRED');

    const link = await this.repository.create(actor.club, {
      categoryId,
      role: body.role,
      requiresApproval,
      expiresAt: addHours(
        this.clock.now(),
        24 * (body.expiresInDays ?? INVITE_LINK_DEFAULT_EXPIRY_DAYS),
      ),
      maxUses: body.maxUses ?? null,
      createdBy: actor.userId,
    });
    this.analytics.capture(actor.userId, 'invite_link_created', {
      role: link.role,
      approval_required: link.requiresApproval,
    });
    return this.serialize(link, actor);
  }

  async revoke(actor: ClubActor, categoryId: string, linkId: string): Promise<void> {
    const link = await this.unrevoked(actor, categoryId, linkId);
    await this.repository.revoke(actor.club, link, actor.userId, this.clock.now());
  }

  async updateApproval(
    actor: ClubActor,
    categoryId: string,
    linkId: string,
    requiresApproval: boolean,
  ): Promise<InviteLink> {
    const link = await this.unrevoked(actor, categoryId, linkId);
    const updated = await this.repository.updateApproval(
      actor.club,
      link.id,
      requiresApproval,
      actor.userId,
    );
    return this.serialize(updated, actor);
  }

  async preview(token: string): Promise<InvitePreview> {
    const preview = this.tokens.isWellFormed(token)
      ? await this.repository.findPreview(this.tokens.hashOf(token))
      : null;
    if (!preview || preview.clubDeletedAt) throw new DomainError('NOT_FOUND');

    const status =
      preview.category.archivedAt === null
        ? inviteLinkStatus(preview, this.clock.now())
        : 'revoked';
    return serializeInvitePreview(preview, status, await this.images.view(preview.club.crestKey));
  }

  private async unrevoked(
    actor: ClubActor,
    categoryId: string,
    linkId: string,
  ): Promise<InviteLinkRecord> {
    const link = await this.repository.findUnrevoked(actor.club, categoryId, linkId);
    if (!link) throw new DomainError('NOT_FOUND');
    return link;
  }

  private serialize(link: InviteLinkRecord, actor: ClubActor): InviteLink {
    return serializeInviteLink(
      link,
      this.tokens.tokenOf(link.id),
      categoryManager(actor, link.categoryId),
    );
  }
}
