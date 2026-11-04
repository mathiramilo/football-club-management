import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { EmailSender } from '../../src/core/email/email-sender.js';
import {
  FakeEmailSender,
  signInWithEmailCode,
  TEST_WEB_ORIGIN,
  uniqueEmail,
} from '../support/auth-fixtures.js';
import { createTestApp } from '../support/create-test-app.js';

// The rest of the suite runs without a cookie domain, as local development does; this file sets one.
vi.hoisted(() => {
  process.env.AUTH_COOKIE_DOMAIN = 'clubapp.example';
});

describe('Session cookie on the shared parent domain (TECH-09, ADR-007)', () => {
  const email = new FakeEmailSender();
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(EmailSender).useValue(email));
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets the session cookie for the parent domain, so the web app on app. sees it', async () => {
    const { cookie } = await signInWithEmailCode(
      app,
      email,
      uniqueEmail('dominio'),
      TEST_WEB_ORIGIN,
    );

    expect(cookie).toMatch(/Domain=\.?clubapp\.example/i);
    expect(cookie).toMatch(/HttpOnly/i);
  });
});
