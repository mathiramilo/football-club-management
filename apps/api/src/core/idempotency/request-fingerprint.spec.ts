import { describe, expect, it } from 'vitest';

import { fingerprintRequest } from './request-fingerprint.js';

describe('fingerprintRequest (TECH-06)', () => {
  const body = { status: 'going', note: { text: 'Llego 20:10', late: true } };

  it('ignores the order of body fields', () => {
    expect(fingerprintRequest('PUT', '/v1/rsvp', body)).toBe(
      fingerprintRequest('PUT', '/v1/rsvp', {
        note: { late: true, text: 'Llego 20:10' },
        status: 'going',
      }),
    );
  });

  it.each([
    { case: 'method', other: ['POST', '/v1/rsvp', body] },
    { case: 'path', other: ['PUT', '/v1/rsvp?scope=this', body] },
    { case: 'body', other: ['PUT', '/v1/rsvp', { ...body, status: 'not_going' }] },
  ] as const)('tells requests apart by $case', ({ other: [method, url, otherBody] }) => {
    expect(fingerprintRequest(method, url, otherBody)).not.toBe(
      fingerprintRequest('PUT', '/v1/rsvp', body),
    );
  });

  it('accepts a request without a body', () => {
    expect(fingerprintRequest('DELETE', '/v1/things/1', undefined)).toMatch(/^[\w-]{43}$/);
  });
});
