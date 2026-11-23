import { Injectable } from '@nestjs/common';
import {
  CLUB_CREST_MAX_BYTES,
  type ClubSummary,
  type ClubUploadResponse,
  type CreateClubUploadBody,
} from '@repo/contracts';

import { Clock } from '../../core/clock/clock.js';
import type { ClubContext } from '../../core/database/club-scope.js';
import { type SquareImageLocation, SquareImages } from '../media/square-images.js';
import { ClubsRepository } from './clubs.repository.js';
import { serializeClub } from './clubs.serializer.js';

const crestsOf = (club: ClubContext): SquareImageLocation => ({
  folder: 'club-crests',
  ownerId: club.clubId,
  maxBytes: CLUB_CREST_MAX_BYTES,
});

@Injectable()
export class ClubCrestService {
  constructor(
    private readonly images: SquareImages,
    private readonly repository: ClubsRepository,
    private readonly clock: Clock,
  ) {}

  createUpload(club: ClubContext, body: CreateClubUploadBody): Promise<ClubUploadResponse> {
    return this.images.createUpload(crestsOf(club), body);
  }

  async set(club: ClubContext, uploadKey: string): Promise<ClubSummary> {
    const crestKey = await this.images.store(crestsOf(club), uploadKey);
    const previous = await this.repository.replaceCrestKey(club, crestKey, this.clock.now());
    await this.images.discard({ uploadKey, imageKey: previous });
    return this.summaryOf(club);
  }

  async remove(club: ClubContext): Promise<ClubSummary> {
    const previous = await this.repository.replaceCrestKey(club, null, this.clock.now());
    await this.images.discard({ imageKey: previous });
    return this.summaryOf(club);
  }

  private async summaryOf(club: ClubContext): Promise<ClubSummary> {
    const record = await this.repository.findClub(club);
    return serializeClub(record, await this.images.view(record.crestKey));
  }
}
