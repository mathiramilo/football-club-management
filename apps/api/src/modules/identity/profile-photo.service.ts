import { Injectable } from '@nestjs/common';
import {
  type CreateProfilePhotoUploadBody,
  PROFILE_PHOTO_MAX_BYTES,
  type ProfilePhoto,
  type ProfilePhotoUploadResponse,
} from '@repo/contracts';

import { Clock } from '../../core/clock/clock.js';
import { type SquareImageLocation, SquareImages } from '../media/square-images.js';
import { ProfileRepository } from './profile.repository.js';

const photosOf = (userId: string): SquareImageLocation => ({
  folder: 'profile-photos',
  ownerId: userId,
  maxBytes: PROFILE_PHOTO_MAX_BYTES,
  fit: 'cover',
});

@Injectable()
export class ProfilePhotoService {
  constructor(
    private readonly images: SquareImages,
    private readonly repository: ProfileRepository,
    private readonly clock: Clock,
  ) {}

  createUpload(
    userId: string,
    body: CreateProfilePhotoUploadBody,
  ): Promise<ProfilePhotoUploadResponse> {
    return this.images.createUpload(photosOf(userId), body);
  }

  async set(userId: string, uploadKey: string): Promise<void> {
    const photoKey = await this.images.store(photosOf(userId), uploadKey);
    const previous = await this.repository.replacePhotoKey(userId, photoKey, this.clock.now());
    await this.images.discard({ uploadKey, imageKey: previous });
  }

  async remove(userId: string): Promise<void> {
    const previous = await this.repository.replacePhotoKey(userId, null, this.clock.now());
    await this.images.discard({ imageKey: previous });
  }

  photoOf(photoKey: string | null): Promise<ProfilePhoto | null> {
    return this.images.view(photoKey);
  }
}
