import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { EmailSender } from '../../src/core/email/email-sender.js';
import { FakeEmailSender, signInWithEmailCode, uniqueEmail } from '../support/auth-fixtures.js';
import { createTestApp } from '../support/create-test-app.js';
import { createUser } from '../support/factories.js';

const errorCode = (response: { body: unknown }) => (response.body as { code?: string }).code;

describe('Sign in with an email code (AUTH-03, BR-AUTH-03)', () => {
  const email = new FakeEmailSender();
  let app: INestApplication<App>;
  let db: PrismaService;

  const http = () => request(app.getHttpServer());
  const requestCode = (address: string) =>
    http()
      .post('/v1/auth/email-otp/send-verification-otp')
      .send({ email: address, type: 'sign-in' })
      .expect(200);
  const submitCode = (address: string, otp: string) =>
    http().post('/v1/auth/sign-in/email-otp').send({ email: address, otp });

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(EmailSender).useValue(email));
    db = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('emails a 6-digit code in Spanish that is valid for 10 minutes', async () => {
    const address = uniqueEmail('codigo');

    await requestCode(address);

    const message = email.sent.findLast((sent) => sent.to === address);
    expect(message?.subject).toBe('Tu código para entrar');
    expect(message?.text).toMatch(/\b\d{6}\b/);
    expect(message?.text).toContain('10 minutos');
  });

  it('creates a verified account for a new email and starts a session', async () => {
    const address = uniqueEmail('nueva');

    const signedIn = await signInWithEmailCode(app, email, address);

    const user = await db.user.findUniqueOrThrow({ where: { email: address } });
    expect(user).toMatchObject({ id: signedIn.userId, emailVerified: true });
    const session = await http()
      .get('/v1/auth/get-session')
      .set('Authorization', `Bearer ${signedIn.token}`)
      .expect(200);
    expect(session.body).toMatchObject({ user: { id: user.id } });
  });

  it('signs into the existing account for a known email (BR-AUTH-01)', async () => {
    const existing = await createUser(db, { email: uniqueEmail('existente'), emailVerified: true });

    const signedIn = await signInWithEmailCode(app, email, existing.email);

    expect(signedIn.userId).toBe(existing.id);
  });

  it('stores the code hashed', async () => {
    const address = uniqueEmail('hash');
    await requestCode(address);

    const rows = await db.authVerification.findMany({
      where: { identifier: { contains: address } },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.value).not.toContain(email.lastCodeFor(address));
  });

  it('accepts a code only once', async () => {
    const address = uniqueEmail('una-vez');
    await requestCode(address);
    const code = email.lastCodeFor(address);

    await submitCode(address, code).expect(200);
    const reused = await submitCode(address, code);

    expect(reused.status).toBe(400);
  });

  it('tells a wrong code from an expired one', async () => {
    const address = uniqueEmail('vencido');
    await requestCode(address);
    const wrong = email.lastCodeFor(address) === '000000' ? '111111' : '000000';

    expect(errorCode(await submitCode(address, wrong))).toBe('INVALID_OTP');

    await db.authVerification.updateMany({
      where: { identifier: { contains: address } },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    expect(errorCode(await submitCode(address, email.lastCodeFor(address)))).toBe('OTP_EXPIRED');
  });

  it('locks the code after 5 wrong attempts', async () => {
    const address = uniqueEmail('intentos');
    await requestCode(address);
    const code = email.lastCodeFor(address);
    const wrong = code === '000000' ? '111111' : '000000';

    for (let attempt = 1; attempt <= 5; attempt++) {
      expect(errorCode(await submitCode(address, wrong))).toBe('INVALID_OTP');
    }

    expect(errorCode(await submitCode(address, code))).toBe('TOO_MANY_ATTEMPTS');
  });
});
