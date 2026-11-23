import { Injectable } from '@nestjs/common';
import type { CreateClubBody, MyClub, MyClubsResponse } from '@repo/contracts';

import { Analytics } from '../../core/analytics/analytics.js';
import { localDate } from '../../core/authorization/club-actor.js';
import { Clock } from '../../core/clock/clock.js';
import { SquareImages } from '../media/square-images.js';
import { type ClubMembershipOfUser, ClubsRepository } from './clubs.repository.js';
import { serializeMyClub } from './clubs.serializer.js';

@Injectable()
export class ClubsService {
  constructor(
    private readonly repository: ClubsRepository,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
    private readonly images: SquareImages,
  ) {}

  async listMine(userId: string): Promise<MyClubsResponse> {
    const now = this.clock.now();
    const memberships = await this.repository.findActiveOfUser(userId);
    return {
      items: await Promise.all(memberships.map((membership) => this.serialize(membership, now))),
    };
  }

  // BR-ROLE-06: the creator becomes Owner and Club Admin, and the DT of the category they coach.
  // TODO(CLUB-09): record these role grants in audit_log once the table exists (NFR-SEC-09).
  async create(userId: string, body: CreateClubBody): Promise<MyClub> {
    const now = this.clock.now();
    const { firstCategory } = body;
    const membership = await this.repository.createWithOwner(
      userId,
      {
        name: body.name,
        shortName: body.shortName ?? null,
        countryCode: body.countryCode,
        timezone: body.timezone,
        primaryColor: body.primaryColor ?? null,
        secondaryColor: body.secondaryColor ?? null,
      },
      firstCategory
        ? {
            name: firstCategory.name,
            format: firstCategory.format,
            startsOn: localDate(now, body.timezone),
          }
        : null,
    );

    this.analytics.capture(userId, 'club_created', { country: membership.club.countryCode });
    for (const { format } of membership.categoryMemberships) {
      this.analytics.capture(userId, 'category_created', { format, from_template: false });
    }
    return this.serialize(membership, now);
  }

  private async serialize(membership: ClubMembershipOfUser, now: Date): Promise<MyClub> {
    return serializeMyClub(membership, await this.images.view(membership.club.crestKey), now);
  }
}
