import { describe, expect, it } from 'vitest';

import { decideEmailCodeRequest } from './email-code-limit.js';

const now = new Date('2026-10-23T12:00:00Z');
const secondsAgo = (seconds: number) => new Date(now.getTime() - seconds * 1000);

describe('decideEmailCodeRequest (BR-AUTH-03, NFR-SEC-05)', () => {
  it.each([
    { case: 'no previous code', previous: [], expected: { allowed: true } },
    { case: 'last code exactly 60 s ago', previous: [secondsAgo(60)], expected: { allowed: true } },
    {
      case: 'last code 59 s ago',
      previous: [secondsAgo(59)],
      expected: { allowed: false, code: 'CODE_RESEND_TOO_SOON', retryAfterSeconds: 1 },
    },
    {
      case: 'last code 15 s ago',
      previous: [secondsAgo(600), secondsAgo(15)],
      expected: { allowed: false, code: 'CODE_RESEND_TOO_SOON', retryAfterSeconds: 45 },
    },
    {
      case: 'four codes in the last hour',
      previous: [secondsAgo(3000), secondsAgo(2000), secondsAgo(1000), secondsAgo(500)],
      expected: { allowed: true },
    },
    {
      case: 'five codes in the last hour',
      previous: [
        secondsAgo(3000),
        secondsAgo(2000),
        secondsAgo(1000),
        secondsAgo(500),
        secondsAgo(120),
      ],
      expected: { allowed: false, code: 'CODE_RATE_LIMITED', retryAfterSeconds: 600 },
    },
    {
      case: 'five codes, the oldest exactly an hour ago',
      previous: [
        secondsAgo(3600),
        secondsAgo(2000),
        secondsAgo(1000),
        secondsAgo(500),
        secondsAgo(120),
      ],
      expected: { allowed: true },
    },
  ])('$case', ({ previous, expected }) => {
    expect(decideEmailCodeRequest(previous, now)).toEqual(expected);
  });
});
