import { z } from 'zod';

const personName = z.string().trim().min(1).max(50);
const nickname = z.string().trim().max(30);
const birthdate = z.iso.date().describe('YYYY-MM-DD (BR-AUTH-05)');

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

export type ProfileResponse = z.infer<typeof profileResponse>;
export type UpdateProfileBody = z.infer<typeof updateProfileBody>;
