import { z } from 'zod';

export const imageMimeType = z.enum(['image/jpeg', 'image/png', 'image/webp']);
export type ImageMimeType = z.infer<typeof imageMimeType>;

export const squareImageFields = {
  id: z.string().describe('Changes with every new image: a cache key for it'),
  url: z.url().describe('512 × 512 WebP, signed; valid until expiresAt'),
  thumbnailUrl: z.url().describe('128 × 128 WebP, signed; valid until expiresAt'),
  expiresAt: z.iso.datetime({ offset: true }),
};

export const presignedUploadFields = {
  uploadKey: z.string().describe('Send it back once the upload succeeds'),
  url: z.url(),
  method: z.literal('PUT'),
  headers: z.record(z.string(), z.string()).describe('Send these headers with the upload'),
  expiresAt: z.iso.datetime({ offset: true }),
};

export const uploadKeyField = z.string().min(1).max(200);
