import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Clock } from '../../src/core/clock/clock.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import { EmailSender } from '../../src/core/email/email-sender.js';
import { FakeEmailSender, uniqueEmail } from '../support/auth-fixtures.js';
import { createTestApp } from '../support/create-test-app.js';
import { FakeClock } from '../support/fake-clock.js';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;

describe('POST /v1/auth/email-otp/send-verification-otp limits per email (BR-AUTH-03, NFR-SEC-05)', () => {
  const email = new FakeEmailSender();
  const clock = new FakeClock(new Date('2026-10-23T12:00:00Z'));
  let app: INestApplication<App>;
  let db: PrismaService;

  const requestCode = (address: string, ip = '203.0.113.10') =>
    request(app.getHttpServer())
      .post('/v1/auth/email-otp/send-verification-otp')
      .set('X-Forwarded-For', ip)
      .send({ email: address, type: 'sign-in' });

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder.overrideProvider(EmailSender).useValue(email).overrideProvider(Clock).useValue(clock),
    );
    db = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows a new code after 60 s and tells the client how long to wait before that', async () => {
    const address = uniqueEmail('reenviar');
    await requestCode(address).expect(200);

    clock.advance(20 * SECOND);
    const early = await requestCode(address).expect(429);
    expect(early.body).toMatchObject({ code: 'CODE_RESEND_TOO_SOON' });
    expect(early.headers['retry-after']).toBe('40');
    expect(email.sent.filter((sent) => sent.to === address)).toHaveLength(1);

    clock.advance(40 * SECOND);
    await requestCode(address).expect(200);
  });

  it('allows at most 5 codes per email per hour, whatever the IP', async () => {
    const address = uniqueEmail('limite');
    for (let i = 1; i <= 5; i++) {
      await requestCode(address, `203.0.113.${String(i)}`).expect(200);
      clock.advance(2 * MINUTE);
    }

    const sixth = await requestCode(address, '198.51.100.1').expect(429);
    expect(sixth.body).toMatchObject({ code: 'CODE_RATE_LIMITED' });
    expect(sixth.headers['retry-after']).toBe(String(50 * 60));

    await requestCode(uniqueEmail('otra'), '198.51.100.1').expect(200);
    clock.advance(50 * MINUTE);
    await requestCode(address).expect(200);
  });

  it('stores a keyed hash of the email, never the address', async () => {
    const address = uniqueEmail('privado');
    clock.advance(2 * MINUTE);

    await requestCode(address).expect(200);

    const rows = await db.emailCodeRequest.findMany({
      orderBy: { requestedAt: 'desc' },
      take: 1,
    });
    expect(rows[0]?.emailHash).not.toContain(address.split('@')[0]);
    expect(JSON.stringify(rows)).not.toContain(address);
  });
});
