import type { ProfilePhoto, ProfileResponse } from '@repo/contracts';
import { ageStatus, displayName, splitProviderName } from '@repo/domain';

import type { ProfileRecord } from './profile.repository.js';

export const isProfileComplete = ({ firstName, lastName, birthdate }: ProfileRecord) =>
  firstName !== null && lastName !== null && birthdate !== null;

export function serializeProfile(
  profile: ProfileRecord,
  photo: ProfilePhoto | null,
  today: string,
): ProfileResponse {
  const { id, email, name, firstName, lastName, nickname, birthdate } = profile;
  return {
    id,
    email,
    firstName,
    lastName,
    nickname,
    birthdate,
    displayName:
      firstName !== null && lastName !== null
        ? displayName({ firstName, lastName, nickname })
        : null,
    isMinor: birthdate === null ? null : ageStatus(birthdate, today) === 'minor',
    profileComplete: isProfileComplete(profile),
    photo,
    suggestedName: name.trim() ? splitProviderName(name) : null,
  };
}
