import { describe, expect, it } from 'vitest';

import {
  decideClaim,
  IN_PROGRESS_LEASE_MS,
  KEY_RETENTION_MS,
  type StoredRequest,
} from './claim.js';

const now = new Date('2026-10-23T12:00:00Z');
const msAgo = (ms: number) => new Date(now.getTime() - ms);

const completed = (startedAgoMs: number): StoredRequest => ({
  requestHash: 'same',
  startedAt: msAgo(startedAgoMs),
  responseStatus: 201,
  responseBody: { id: 'a' },
});

const running = (startedAgoMs: number): StoredRequest => ({
  requestHash: 'same',
  startedAt: msAgo(startedAgoMs),
  responseStatus: null,
  responseBody: null,
});

describe('decideClaim (TECH-06)', () => {
  it.each([
    { case: 'a new key', stored: null, hash: 'same', expected: { outcome: 'proceed' } },
    {
      case: 'a finished request',
      stored: completed(5_000),
      hash: 'same',
      expected: { outcome: 'replay', status: 201, body: { id: 'a' } },
    },
    {
      case: 'the same key with another request',
      stored: completed(5_000),
      hash: 'other',
      expected: { outcome: 'reused' },
    },
    {
      case: 'a request still running',
      stored: running(IN_PROGRESS_LEASE_MS - 1),
      hash: 'same',
      expected: { outcome: 'in_progress' },
    },
    {
      case: 'a request abandoned for a minute',
      stored: running(IN_PROGRESS_LEASE_MS),
      hash: 'same',
      expected: { outcome: 'proceed' },
    },
    {
      case: 'a finished request just under 24 hours old',
      stored: completed(KEY_RETENTION_MS - 1),
      hash: 'same',
      expected: { outcome: 'replay', status: 201, body: { id: 'a' } },
    },
    {
      case: 'a key 24 hours old, even with another request',
      stored: completed(KEY_RETENTION_MS),
      hash: 'other',
      expected: { outcome: 'proceed' },
    },
  ])('decides $case', ({ stored, hash, expected }) => {
    expect(decideClaim(stored, hash, now)).toEqual(expected);
  });
});
