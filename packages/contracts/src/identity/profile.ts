import { z } from 'zod';

import { imageMimeType } from '../media/images.js';

const personName = z.string().trim().min(1).max(50);
const nickname = z.string().trim().max(30);
const birthdate = z.iso.date().describe('YYYY-MM-DD (BR-AUTH-05)');

export const PROFILE_PHOTO_MAX_BYTES = 300 * 1024;
export const profilePhotoMimeType = imageMimeType;

export const profilePhoto = z
  .object({
    id: z.string().describe('Changes with every new photo: a cache key for the image'),
    url: z.url().describe('512 × 512 WebP, signed; valid until expiresAt'),
    thumbnailUrl: z.url().describe('128 × 128 WebP, signed; valid until expiresAt'),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .meta({ id: 'ProfilePhoto' });

export const profileResponse = z
  .object({
    id: z.uuid(),
    email: z.email(),
    firstName: z.string().nullable().describe('Null until the profile is completed'),
    lastName: z.string().nullable().describe('Null until the profile is completed'),
    nickname: z.string().nullable(),
    birthdate: birthdate.nullable().describe('Null until the profile is completed'),
    displayName: z
      .string()
      .nullable()
      .describe(
        'The nickname, or the first name and last-name initial (BR-AUTH-07); null until the profile is completed',
      ),
    isMinor: z
      .boolean()
      .nullable()
      .describe('Whether the user is 16 or 17 (BR-AUTH-05); null until the birthdate is set'),
    profileComplete: z
      .boolean()
      .describe('Whether the first name, last name and birthdate are set (AUTH-05)'),
    photo: profilePhoto.nullable(),
    suggestedName: z
      .object({ firstName: z.string(), lastName: z.string() })
      .nullable()
      .describe('The name from Google or Apple, to prefill the form; null when there is none'),
  })
  .meta({ id: 'ProfileResponse' });

export const updateProfileBody = z
  .object({
    firstName: personName.optional(),
    lastName: personName.optional(),
    nickname: nickname.nullable().optional().describe('Null or an empty string removes it'),
    birthdate: birthdate
      .optional()
      .describe('Set once: after the first save only support can change it (F01 § 5)'),
  })
  .meta({ id: 'UpdateProfileBody' });

export const createProfilePhotoUploadBody = z
  .object({
    mimeType: profilePhotoMimeType,
    sizeBytes: z
      .int()
      .min(1)
      .max(PROFILE_PHOTO_MAX_BYTES)
      .describe('The exact size of the file to upload; compressed on the device first (AUTH-05)'),
  })
  .meta({ id: 'CreateProfilePhotoUploadBody' });

export const profilePhotoUploadResponse = z
  .object({
    uploadKey: z.string().describe('Send it to PUT /v1/me/photo once the upload succeeds'),
    url: z.url(),
    method: z.literal('PUT'),
    headers: z.record(z.string(), z.string()).describe('Send these headers with the upload'),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .meta({ id: 'ProfilePhotoUploadResponse' });

export const setProfilePhotoBody = z
  .object({ uploadKey: z.string().min(1).max(200) })
  .meta({ id: 'SetProfilePhotoBody' });

export type ProfilePhoto = z.infer<typeof profilePhoto>;
export type ProfilePhotoMimeType = z.infer<typeof profilePhotoMimeType>;
export type CreateProfilePhotoUploadBody = z.infer<typeof createProfilePhotoUploadBody>;
export type ProfilePhotoUploadResponse = z.infer<typeof profilePhotoUploadResponse>;
export type SetProfilePhotoBody = z.infer<typeof setProfilePhotoBody>;
export type ProfileResponse = z.infer<typeof profileResponse>;
export type UpdateProfileBody = z.infer<typeof updateProfileBody>;
