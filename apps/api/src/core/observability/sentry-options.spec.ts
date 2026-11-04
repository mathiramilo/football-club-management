import type { ErrorEvent } from '@sentry/nestjs';
import { describe, expect, it } from 'vitest';

import { scrubBreadcrumb, scrubEvent, sentryOptions } from './sentry-options.js';

describe('Sentry options (TECH-10, NFR-OBS-01)', () => {
  it('collects no cookies, bodies, query strings, query values, job data or local variables', () => {
    const { dataCollection } = sentryOptions({
      SENTRY_DSN: undefined,
      SENTRY_ENVIRONMENT: 'test',
      SENTRY_TRACES_SAMPLE_RATE: 0,
    });

    expect(dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    });
  });

  it('keeps only the request method, path and harmless headers, and the user ID', () => {
    const event: ErrorEvent = {
      type: undefined,
      request: {
        method: 'POST',
        url: 'https://api.example.test/v1/auth/callback/google?code=4821&state=abc',
        query_string: 'code=4821&state=abc',
        cookies: { 'better-auth.session_token': 'cookie-secret' },
        data: { email: 'lucia.prueba@example.test' },
        headers: {
          authorization: 'Bearer token-secret',
          'user-agent': 'ClubApp/1.4.0',
          'X-Platform': 'ios',
        },
      },
      user: { id: 'user-1', email: 'lucia.prueba@example.test', ip_address: '203.0.113.7' },
    };

    expect(scrubEvent(event)).toMatchObject({
      request: {
        method: 'POST',
        url: 'https://api.example.test/v1/auth/callback/google',
        headers: { 'user-agent': 'ClubApp/1.4.0', 'X-Platform': 'ios' },
      },
      user: { id: 'user-1' },
    });
    expect(JSON.stringify(event)).not.toMatch(
      /4821|cookie-secret|token-secret|lucia\.prueba|203\.0\.113/,
    );
  });

  it('drops error messages and keeps their type and frames', () => {
    const frames = [{ function: 'loadMember', filename: 'members.service.js', lineno: 12 }];
    const event: ErrorEvent = {
      type: undefined,
      exception: {
        values: [
          {
            type: 'PrismaClientKnownRequestError',
            value: 'email = lucia.prueba@example.test',
            stacktrace: { frames },
          },
        ],
      },
    };

    expect(scrubEvent(event).exception?.values).toEqual([
      { type: 'PrismaClientKnownRequestError', stacktrace: { frames } },
    ]);
  });

  it('drops console breadcrumbs and query strings from request breadcrumbs', () => {
    expect(
      scrubBreadcrumb({ category: 'console', message: 'lucia.prueba@example.test' }),
    ).toBeNull();
    expect(
      scrubBreadcrumb({
        category: 'http',
        data: {
          url: 'https://api.example.test/v1/invites?token=invite-secret',
          'http.query': 'token=invite-secret',
        },
      }),
    ).toEqual({ category: 'http', data: { url: 'https://api.example.test/v1/invites' } });
  });
});
