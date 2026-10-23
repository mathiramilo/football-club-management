import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { EmailSender } from '../../src/core/email/email-sender.js';
import { FakeEmailSender, uniqueEmail } from '../support/auth-fixtures.js';
import { createTestApp } from '../support/create-test-app.js';

// The rest of the suite runs without Better Auth's limiter; this file boots with it on.
vi.hoisted(() => {
  process.env.AUTH_RATE_LIMIT_ENABLED = 'true';
});

describe('POST /v1/auth/email-otp/send-verification-otp limits per IP (NFR-SEC-05)', () => {
  let app: INestApplication<App>;

  const requestCode = (ip: string) =>
    request(app.getHttpServer())
      .post('/v1/auth/email-otp/send-verification-otp')
      .set('X-Forwarded-For', ip)
      .send({ email: uniqueEmail('ip'), type: 'sign-in' });

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder.overrideProvider(EmailSender).useValue(new FakeEmailSender()),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows 30 code requests per IP per hour, then answers 429', async () => {
    for (let i = 1; i <= 30; i++) {
      await requestCode('203.0.113.77').expect(200);
    }

    const blocked = await requestCode('203.0.113.77').expect(429);

    expect(Number(blocked.headers['x-retry-after'])).toBeGreaterThan(3000);
    await requestCode('203.0.113.78').expect(200);
  });
});
