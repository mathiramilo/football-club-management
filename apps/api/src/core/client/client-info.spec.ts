import { describe, expect, it } from 'vitest';

import { clientInfoFrom } from './client-info.js';

describe('clientInfoFrom (TECH-06)', () => {
  it.each([
    {
      case: 'both headers',
      headers: { 'x-platform': 'android', 'x-app-version': '1.3.0' },
      expected: { platform: 'android', appVersion: '1.3.0' },
    },
    {
      case: 'a pre-release version',
      headers: { 'x-platform': 'ios', 'x-app-version': '1.4.0-beta.2' },
      expected: { platform: 'ios', appVersion: '1.4.0-beta.2' },
    },
    { case: 'no headers', headers: {}, expected: {} },
    {
      case: 'an unknown platform',
      headers: { 'x-platform': 'windows', 'x-app-version': '1.3.0' },
      expected: { appVersion: '1.3.0' },
    },
    {
      case: 'a version that is not semantic',
      headers: { 'x-platform': 'web', 'x-app-version': '1.3' },
      expected: { platform: 'web' },
    },
    {
      case: 'a repeated header',
      headers: { 'x-platform': ['ios', 'android'] },
      expected: {},
    },
  ])('reads $case', ({ headers, expected }) => {
    expect(clientInfoFrom(headers)).toEqual(expected);
  });
});
