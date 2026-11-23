import { z } from 'zod';

import { extensibleEnum } from '../extensible-enum.js';
import {
  imageMimeType,
  presignedUploadFields,
  squareImageFields,
  uploadKeyField,
} from '../media/images.js';

export const categoryFormats = ['f11', 'f9', 'f8', 'f7', 'f5', 'futsal'] as const;
export const categoryFormat = z.enum(categoryFormats);
export type CategoryFormat = z.infer<typeof categoryFormat>;

const resolvedTimeZone = (value: string): string | null => {
  try {
    return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
};

const clubName = z.string().trim().min(2).max(60);
const shortName = z.string().trim().min(1).max(12);
const countryCode = z
  .string()
  .trim()
  .overwrite((value) => value.toUpperCase())
  .regex(/^[A-Za-z]{2}$/)
  .describe('ISO 3166-1 alpha-2');
const timezone = z
  .string()
  .trim()
  .max(64)
  .overwrite((value) => resolvedTimeZone(value) ?? value)
  .refine((value) => resolvedTimeZone(value) !== null, 'Unknown time zone')
  .describe('IANA time zone, e.g. America/Montevideo');
const color = z
  .string()
  .trim()
  .overwrite((value) => value.toLowerCase())
  .regex(/^#[0-9a-fA-F]{6}$/)
  .describe('#rrggbb; clients keep text readable on it (UX § 7.1)');
const categoryName = z.string().trim().min(2).max(40);

export const CLUB_CREST_MAX_BYTES = 500 * 1024;

export const clubCrest = z.object(squareImageFields).meta({ id: 'ClubCrest' });

export const clubSummary = z
  .object({
    id: z.uuid(),
    name: z.string(),
    shortName: z.string().nullable(),
    countryCode: z.string(),
    timezone: z.string(),
    primaryColor: z.string().nullable(),
    secondaryColor: z.string().nullable(),
    crest: clubCrest.nullable(),
  })
  .meta({ id: 'ClubSummary' });

export const myCategoryRole = z
  .object({
    categoryId: z.uuid(),
    name: z.string(),
    format: extensibleEnum(categoryFormats),
    staffRole: extensibleEnum(['dt', 'coach']).nullable(),
    isPlayer: z.boolean(),
  })
  .meta({ id: 'MyCategoryRole' });

export const myClub = z
  .object({
    club: clubSummary,
    membershipId: z.uuid(),
    isOwner: z.boolean(),
    isAdmin: z.boolean().describe('True for the Owner too (permission matrix § 4)'),
    categories: z
      .array(myCategoryRole)
      .describe('Current memberships on the club calendar day, in non-archived categories'),
  })
  .meta({ id: 'MyClub' });

export const myClubsResponse = z
  .object({ items: z.array(myClub).describe('Sorted by club name') })
  .meta({ id: 'MyClubsResponse' });

export const createClubBody = z
  .object({
    name: clubName,
    shortName: shortName.nullable().optional().describe('Shown in compact UI (BR-CLUB-01)'),
    countryCode,
    timezone,
    primaryColor: color.nullable().optional(),
    secondaryColor: color.nullable().optional(),
    firstCategory: z
      .object({
        name: categoryName,
        format: categoryFormat.optional().describe('Default f11 (BR-CLUB-03)'),
      })
      .optional()
      .describe('The category the creator coaches; they become its DT from today (BR-ROLE-06)'),
  })
  .meta({ id: 'CreateClubBody' });

export const createClubUploadBody = z
  .discriminatedUnion('purpose', [
    z.object({
      purpose: z.literal('club_crest'),
      mimeType: imageMimeType,
      sizeBytes: z
        .int()
        .min(1)
        .max(CLUB_CREST_MAX_BYTES)
        .describe('The exact size of the file; compressed on the device first (BR-CLUB-01)'),
    }),
  ])
  .meta({ id: 'CreateClubUploadBody' });

export const clubUploadResponse = z
  .object(presignedUploadFields)
  .meta({ id: 'ClubUploadResponse' });

export const setClubCrestBody = z
  .object({ uploadKey: uploadKeyField })
  .meta({ id: 'SetClubCrestBody' });

export type ClubCrest = z.infer<typeof clubCrest>;
export type CreateClubUploadBody = z.infer<typeof createClubUploadBody>;
export type ClubUploadResponse = z.infer<typeof clubUploadResponse>;
export type SetClubCrestBody = z.infer<typeof setClubCrestBody>;
export type ClubSummary = z.infer<typeof clubSummary>;
export type MyCategoryRole = z.infer<typeof myCategoryRole>;
export type MyClub = z.infer<typeof myClub>;
export type MyClubsResponse = z.infer<typeof myClubsResponse>;
export type CreateClubBody = z.infer<typeof createClubBody>;
