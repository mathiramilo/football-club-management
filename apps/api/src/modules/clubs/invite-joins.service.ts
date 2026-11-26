import { Injectable } from '@nestjs/common';
import type { AcceptInviteResponse } from '@repo/contracts';
import { inviteAcceptOutcome, inviteLinkStatus, isProfileComplete } from '@repo/domain';

import { Analytics } from '../../core/analytics/analytics.js';
import { localDate } from '../../core/authorization/club-actor.js';
import { Clock } from '../../core/clock/clock.js';
import { DomainError } from '../../core/errors/domain-error.js';
import { type AcceptableInvite, InviteJoinsRepository } from './invite-joins.repository.js';
import { InviteTokens } from './invite-tokens.js';

@Injectable()
export class InviteJoinsService {
  constructor(
    private readonly repository: InviteJoinsRepository,
    private readonly tokens: InviteTokens,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
  ) {}

  // BR-AUTH-09, BR-AUTH-10: join the link's category, or ask to join it when the link requires approval.
  // TODO(CLUB-06): flag possible duplicates (BR-CLUB-10) and notify approvers (N-09).
  async accept(userId: string, token: string): Promise<AcceptInviteResponse> {
    const invite = await this.find(token);
    if (!isProfileComplete(await this.repository.findRequiredProfile(userId)))
      throw new DomainError('PROFILE_INCOMPLETE');

    if (invite.categoryArchivedAt !== null) throw new DomainError('INVITE_LINK_INACTIVE');

    const now = this.clock.now();
    const active = inviteLinkStatus(invite, now) === 'active';
    const decision = await this.repository.accept(
      invite,
      userId,
      { now, today: localDate(now, invite.clubTimezone) },
      (standing, hasPendingRequest) => {
        const outcome = inviteAcceptOutcome(invite, standing, hasPendingRequest);
        const usesLink = outcome === 'joined' || outcome === 'requested';
        return usesLink && !active ? 'inactive' : outcome;
      },
    );
    if (decision === 'inactive') throw new DomainError('INVITE_LINK_INACTIVE');

    this.analytics.capture(userId, 'invite_link_accepted', {
      role: invite.role,
      outcome: decision,
    });
    return { outcome: decision, clubId: invite.clubId, categoryId: invite.categoryId };
  }

  private async find(token: string): Promise<AcceptableInvite> {
    const invite = this.tokens.isWellFormed(token)
      ? await this.repository.findByTokenHash(this.tokens.hashOf(token))
      : null;
    if (!invite || invite.clubDeletedAt) throw new DomainError('NOT_FOUND');
    return invite;
  }
}
