import { describe, expect, it } from 'vitest';

import { redactTokenPaths, scrubPath } from './scrub-path.js';

describe('scrubPath (privacy: tokens never in logs)', () => {
  it('drops the query string', () => {
    expect(scrubPath('/v1/auth/callback/google?code=4821')).toBe('/v1/auth/callback/google');
  });

  it('redacts the invite token in paths and full URLs (CLUB-05)', () => {
    expect(scrubPath('/v1/public/invites/Y19tKpsMXcghmlkj_t85mw')).toBe(
      '/v1/public/invites/[redacted]',
    );
    expect(scrubPath('https://api.example.test/v1/public/invites/Y19tKpsMXcghmlkj_t85mw?x=1')).toBe(
      'https://api.example.test/v1/public/invites/[redacted]',
    );
  });

  it('redacts the invite token when accepting it (AUTH-06)', () => {
    expect(scrubPath('/v1/invites/Y19tKpsMXcghmlkj_t85mw/accept')).toBe(
      '/v1/invites/[redacted]/accept',
    );
  });

  it('redacts the invite token inside span names', () => {
    expect(redactTokenPaths('GET /v1/public/invites/Y19tKpsMXcghmlkj_t85mw')).toBe(
      'GET /v1/public/invites/[redacted]',
    );
  });

  it('leaves other paths alone', () => {
    expect(scrubPath('/v1/clubs/0190/categories/0191/invite-links')).toBe(
      '/v1/clubs/0190/categories/0191/invite-links',
    );
  });
});
