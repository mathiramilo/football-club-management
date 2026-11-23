import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  type CreateProfilePhotoUploadBody,
  PROFILE_PHOTO_MAX_BYTES,
  type ProfilePhoto,
  type ProfilePhotoUploadResponse,
} from '@repo/contracts';

import { Clock } from '../../core/clock/clock.js';
import { DomainError } from '../../core/errors/domain-error.js';
import { ImageProcessor } from '../media/image-processor.js';
import { ObjectStorage } from '../media/object-storage.js';
import { ProfileRepository } from './profile.repository.js';

const UPLOAD_TTL_SECONDS = 10 * 60;
const READ_TTL_SECONDS = 60 * 60;
const PHOTO_SIZE = 512;
const THUMBNAIL_SIZE = 128;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const uploadPrefix = (userId: string) => `uploads/profile-photos/${userId}/`;
const variantKey = (photoKey: string, size: number) => `${photoKey}/${String(size)}.webp`;
const variantKeys = (photoKey: string) =>
  [PHOTO_SIZE, THUMBNAIL_SIZE].map((size) => variantKey(photoKey, size));
const photoIdOf = (photoKey: string) => photoKey.slice(photoKey.lastIndexOf('/') + 1);

@Injectable()
export class ProfilePhotoService {
  constructor(
    private readonly storage: ObjectStorage,
    private readonly images: ImageProcessor,
    private readonly repository: ProfileRepository,
    private readonly clock: Clock,
  ) {}

  async createUpload(
    userId: string,
    { mimeType, sizeBytes }: CreateProfilePhotoUploadBody,
  ): Promise<ProfilePhotoUploadResponse> {
    const uploadKey = `${uploadPrefix(userId)}${randomUUID()}`;
    const upload = await this.storage.presignUpload({
      key: uploadKey,
      contentType: mimeType,
      sizeBytes,
      expiresInSeconds: UPLOAD_TTL_SECONDS,
    });
    return { uploadKey, ...upload, expiresAt: this.inSeconds(UPLOAD_TTL_SECONDS) };
  }

  async set(userId: string, uploadKey: string): Promise<void> {
    if (!new RegExp(`^${uploadPrefix(userId)}${UUID}$`).test(uploadKey)) {
      throw new DomainError('UPLOAD_NOT_FOUND');
    }
    const upload = await this.storage.read(uploadKey, PROFILE_PHOTO_MAX_BYTES);
    if (upload.status === 'missing') throw new DomainError('UPLOAD_NOT_FOUND');
    const processed =
      upload.status === 'found'
        ? await this.images.squareWebpVariants(upload.object.body, [PHOTO_SIZE, THUMBNAIL_SIZE])
        : ({ status: 'invalid' } as const);
    if (processed.status === 'invalid') {
      await this.storage.delete([uploadKey]);
      throw new DomainError('UPLOAD_INVALID');
    }

    const photoKey = `profile-photos/${userId}/${randomUUID()}`;
    await Promise.all(
      processed.variants.map(({ size, body }) =>
        this.storage.write(variantKey(photoKey, size), body, 'image/webp'),
      ),
    );
    const previous = await this.repository.replacePhotoKey(userId, photoKey, this.clock.now());
    await this.storage.delete([uploadKey, ...(previous ? variantKeys(previous) : [])]);
  }

  async remove(userId: string): Promise<void> {
    const previous = await this.repository.replacePhotoKey(userId, null, this.clock.now());
    if (previous) await this.storage.delete(variantKeys(previous));
  }

  async photoOf(photoKey: string | null): Promise<ProfilePhoto | null> {
    if (!photoKey) return null;
    const [url, thumbnailUrl] = await Promise.all(
      [PHOTO_SIZE, THUMBNAIL_SIZE].map((size) =>
        this.storage.presignDownload(variantKey(photoKey, size), READ_TTL_SECONDS),
      ),
    );
    if (!url || !thumbnailUrl) return null;
    return {
      id: photoIdOf(photoKey),
      url,
      thumbnailUrl,
      expiresAt: this.inSeconds(READ_TTL_SECONDS),
    };
  }

  private inSeconds(seconds: number): string {
    return new Date(this.clock.now().getTime() + seconds * 1000).toISOString();
  }
}
