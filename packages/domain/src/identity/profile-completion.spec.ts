import { describe, expect, it } from 'vitest';

import { isProfileComplete } from './profile-completion.js';

describe('isProfileComplete (BR-AUTH-06)', () => {
  const complete = { firstName: 'Ana', lastName: 'Sintética', birthdate: '2000-01-01' };

  it('is complete with first name, last name and birthdate', () => {
    expect(isProfileComplete(complete)).toBe(true);
  });

  it.each(['firstName', 'lastName', 'birthdate'] as const)('is incomplete without %s', (field) => {
    expect(isProfileComplete({ ...complete, [field]: null })).toBe(false);
  });
});
