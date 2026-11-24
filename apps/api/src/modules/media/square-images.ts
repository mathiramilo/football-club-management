import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { Clock } from '../../core/clock/clock.js';
import { DomainError } from '../../core/errors/domain-error.js';
import { ImageProcessor, type SquareFit } from './image-processor.js';
import { ObjectStorage } from './object-storage.js';

const UPLOAD_TTL_SECONDS = 10 * 60;
const READ_TTL_SECONDS = 60 * 60;
const IMAGE_SIZE = 512;
const THUMBNAIL_SIZE = 128;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

export interface SquareImageLocation {
  readonly folder: string;
  readonly ownerId: string;
  readonly maxBytes: number;
  readonly fit: SquareFit;
}

export interface SquareImageUpload {
  uploadKey: string;
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
}

export interface SquareImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  expiresAt: string;
}

const uploadPrefix = ({ folder, ownerId }: SquareImageLocation) => `uploads/${folder}/${ownerId}/`;
const variantKey = (imageKey: string, size: number) => `${imageKey}/${String(size)}.webp`;
const variantKeys = (imageKey: string) =>
  [IMAGE_SIZE, THUMBNAIL_SIZE].map((size) => variantKey(imageKey, size));

// Square images (profile photos, club crests) are uploaded straight to storage, then decoded and
// re-encoded into 512 and 128 px WebP before anything points at them (NFR-SEC-08).
@Injectable()
export class SquareImages {
  constructor(
    private readonly storage: ObjectStorage,
    private readonly images: ImageProcessor,
    private readonly clock: Clock,
  ) {}

  async createUpload(
    location: SquareImageLocation,
    { mimeType, sizeBytes }: { mimeType: string; sizeBytes: number },
  ): Promise<SquareImageUpload> {
    const uploadKey = `${uploadPrefix(location)}${randomUUID()}`;
    const upload = await this.storage.presignUpload({
      key: uploadKey,
      contentType: mimeType,
      sizeBytes,
      expiresInSeconds: UPLOAD_TTL_SECONDS,
    });
    return { uploadKey, ...upload, expiresAt: this.inSeconds(UPLOAD_TTL_SECONDS) };
  }

  async store(location: SquareImageLocation, uploadKey: string): Promise<string> {
    if (!new RegExp(`^${uploadPrefix(location)}${UUID}$`).test(uploadKey)) {
      throw new DomainError('UPLOAD_NOT_FOUND');
    }
    const upload = await this.storage.read(uploadKey, location.maxBytes);
    if (upload.status === 'missing') throw new DomainError('UPLOAD_NOT_FOUND');
    const processed =
      upload.status === 'found'
        ? await this.images.squareWebpVariants(
            upload.object.body,
            [IMAGE_SIZE, THUMBNAIL_SIZE],
            location.fit,
          )
        : ({ status: 'invalid' } as const);
    if (processed.status === 'invalid') {
      await this.storage.delete([uploadKey]);
      throw new DomainError('UPLOAD_INVALID');
    }

    const imageKey = `${location.folder}/${location.ownerId}/${randomUUID()}`;
    await Promise.all(
      processed.variants.map(({ size, body }) =>
        this.storage.write(variantKey(imageKey, size), body, 'image/webp'),
      ),
    );
    return imageKey;
  }

  async discard({ uploadKey, imageKey }: { uploadKey?: string; imageKey?: string | null }) {
    const keys = [...(uploadKey ? [uploadKey] : []), ...(imageKey ? variantKeys(imageKey) : [])];
    if (keys.length > 0) await this.storage.delete(keys);
  }

  async view(imageKey: string | null): Promise<SquareImage | null> {
    if (!imageKey) return null;
    const [url, thumbnailUrl] = await Promise.all(
      [IMAGE_SIZE, THUMBNAIL_SIZE].map((size) =>
        this.storage.presignDownload(variantKey(imageKey, size), READ_TTL_SECONDS),
      ),
    );
    if (!url || !thumbnailUrl) return null;
    return {
      id: imageKey.slice(imageKey.lastIndexOf('/') + 1),
      url,
      thumbnailUrl,
      expiresAt: this.inSeconds(READ_TTL_SECONDS),
    };
  }

  private inSeconds(seconds: number): string {
    return new Date(this.clock.now().getTime() + seconds * 1000).toISOString();
  }
}
