import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  ObjectStorage,
  type PresignedUpload,
  type ReadResult,
  type UploadSlot,
} from './object-storage.js';

export interface S3Settings {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const DELETE_BATCH = 1000;

export const createS3Client = ({ endpoint, region, accessKeyId, secretAccessKey }: S3Settings) =>
  new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
    // The SDK otherwise signs a checksum of an empty body into presigned URLs, and R2 and
    // SeaweedFS then reject the real upload as BadDigest.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

export class S3ObjectStorage extends ObjectStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {
    super();
  }

  async presignUpload({
    key,
    contentType,
    sizeBytes,
    expiresInSeconds,
  }: UploadSlot): Promise<PresignedUpload> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: sizeBytes,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
      signableHeaders: new Set(['content-type', 'content-length']),
    });
    return { url, method: 'PUT', headers: { 'Content-Type': contentType } };
  }

  presignDownload(key: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  async read(key: string, maxBytes: number): Promise<ReadResult> {
    try {
      const { ContentLength } = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (ContentLength === undefined || ContentLength > maxBytes) return { status: 'too_large' };
      const { Body, ContentType } = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!Body) return { status: 'missing' };
      const body = Buffer.from(await Body.transformToByteArray());
      if (body.length > maxBytes) return { status: 'too_large' };
      return { status: 'found', object: { body, contentType: ContentType } };
    } catch (error) {
      if (error instanceof NotFound || error instanceof NoSuchKey) return { status: 'missing' };
      throw error;
    }
  }

  async write(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async delete(keys: readonly string[]): Promise<void> {
    for (let start = 0; start < keys.length; start += DELETE_BATCH) {
      const batch = keys.slice(start, start + DELETE_BATCH);
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
  }
}
