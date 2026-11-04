import type { INestApplication } from '@nestjs/common';
import type { AnalyticsEventName, AnalyticsEvents } from '@repo/contracts';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Analytics } from '../../src/core/analytics/analytics.js';
import { signInMethodOf } from '../../src/core/auth/sign-in-analytics.js';
import { Clock } from '../../src/core/clock/clock.js';
import { EmailSender } from '../../src/core/email/email-sender.js';
import {
  type FakeIdentityProvider,
  FakeEmailSender,
  fakeGoogleAndApple,
  signInWithEmailCode,
  TEST_GOOGLE_CLIENT_IDS,
  uniqueEmail,
  uniqueSubject,
} from '../support/auth-fixtures.js';
import { createTestApp } from '../support/create-test-app.js';
import { FakeClock } from '../support/fake-clock.js';

class FakeAnalytics extends Analytics {
  readonly captured: { userId: string; event: AnalyticsEventName; properties: object }[] = [];

  capture<Event extends AnalyticsEventName>(
    userId: string,
    event: Event,
    properties: AnalyticsEvents[Event],
  ): void {
    this.captured.push({ userId, event, properties });
  }
}

describe('sign_in_completed (F01 telemetry, TECH-10)', () => {
  const email = new FakeEmailSender();
  const analytics = new FakeAnalytics();
  const clock = new FakeClock(new Date());
  let app: INestApplication<App>;
  let google: FakeIdentityProvider;

  beforeAll(async () => {
    ({ google } = await fakeGoogleAndApple());
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(EmailSender)
        .useValue(email)
        .overrideProvider(Analytics)
        .useValue(analytics)
        .overrideProvider(Clock)
        .useValue(clock),
    );
  });

  beforeEach(() => {
    analytics.captured.length = 0;
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it('marks the first email code sign-in as a new account, and the next one not', async () => {
    const address = uniqueEmail('analitica');

    const first = await signInWithEmailCode(app, email, address);
    clock.advance(2 * 60_000);
    await signInWithEmailCode(app, email, address);

    expect(analytics.captured).toEqual([
      {
        userId: first.userId,
        event: 'sign_in_completed',
        properties: { method: 'email_code', new_account: true },
      },
      {
        userId: first.userId,
        event: 'sign_in_completed',
        properties: { method: 'email_code', new_account: false },
      },
    ]);
  });

  it('names the provider of an ID token sign-in', async () => {
    const token = await google.sign(
      { sub: uniqueSubject(), email: uniqueEmail('google'), email_verified: true },
      { audience: TEST_GOOGLE_CLIENT_IDS.ios },
    );

    const response = await request(app.getHttpServer())
      .post('/v1/auth/sign-in/social')
      .send({ provider: 'google', idToken: { token } })
      .expect(200);

    expect(analytics.captured).toEqual([
      {
        userId: (response.body as { user: { id: string } }).user.id,
        event: 'sign_in_completed',
        properties: { method: 'google', new_account: true },
      },
    ]);
  });

  it('sends nothing when the sign-in fails', async () => {
    const address = uniqueEmail('fallido');
    await request(app.getHttpServer())
      .post('/v1/auth/email-otp/send-verification-otp')
      .send({ email: address, type: 'sign-in' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/sign-in/email-otp')
      .send({ email: address, otp: '000000' })
      .expect(400);

    expect(analytics.captured).toEqual([]);
  });

  it.each([
    { path: '/callback/:id', params: { id: 'apple' }, method: 'apple' },
    { path: '/callback/:id', params: { id: 'github' }, method: undefined },
    { path: '/sign-in/social', body: { provider: 'apple' }, method: 'apple' },
    { path: '/sign-in/email-otp', method: 'email_code' },
    { path: '/get-session', method: undefined },
  ])('reads the sign-in method of $path', ({ method, ...signIn }) => {
    expect(signInMethodOf(signIn)).toBe(method);
  });
});
