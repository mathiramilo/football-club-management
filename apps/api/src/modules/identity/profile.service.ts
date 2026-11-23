import { Injectable } from '@nestjs/common';
import type { ProfileResponse, UpdateProfileBody } from '@repo/contracts';
import { ageStatus } from '@repo/domain';

import { Analytics } from '../../core/analytics/analytics.js';
import { localDate } from '../../core/authorization/club-actor.js';
import { Clock } from '../../core/clock/clock.js';
import { DomainError } from '../../core/errors/domain-error.js';
import { type ProfileRecord, ProfileRepository } from './profile.repository.js';
import { ProfilePhotoService } from './profile-photo.service.js';
import { isProfileComplete, serializeProfile } from './profile.serializer.js';

// BR-AUTH-05: accounts have no time zone, so ages are counted on the calendar day in Uruguay,
// which Argentina shares.
const AGE_TIME_ZONE = 'America/Montevideo';

@Injectable()
export class ProfileService {
  constructor(
    private readonly repository: ProfileRepository,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
    private readonly photos: ProfilePhotoService,
  ) {}

  async get(userId: string): Promise<ProfileResponse> {
    return this.serialize(await this.repository.find(userId), this.today());
  }

  async update(userId: string, body: UpdateProfileBody): Promise<ProfileResponse> {
    const today = this.today();
    const before = await this.repository.find(userId);
    const { birthdate } = body;
    if (birthdate !== undefined) {
      if (before.birthdate !== null && before.birthdate !== birthdate) {
        throw new DomainError('BIRTHDATE_LOCKED');
      }
      if (ageStatus(birthdate, today) === 'under_minimum') {
        throw new DomainError('UNDER_MINIMUM_AGE');
      }
    }

    const updated = await this.repository.update(userId, {
      ...body,
      ...(body.nickname === '' && { nickname: null }),
    });
    if (!updated) throw new DomainError('BIRTHDATE_LOCKED');

    const after = await this.repository.find(userId);
    if (!isProfileComplete(before) && isProfileComplete(after)) this.trackCompletion(after, today);
    return this.serialize(after, today);
  }

  private async serialize(profile: ProfileRecord, today: string): Promise<ProfileResponse> {
    return serializeProfile(profile, await this.photos.photoOf(profile.photoKey), today);
  }

  private trackCompletion(profile: ProfileRecord, today: string): void {
    if (profile.birthdate === null) return;
    this.analytics.capture(profile.id, 'profile_completed', {
      is_minor: ageStatus(profile.birthdate, today) === 'minor',
    });
  }

  private today(): string {
    return localDate(this.clock.now(), AGE_TIME_ZONE);
  }
}
