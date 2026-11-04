import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { Public } from '../../src/core/auth/public.decorator.js';
import { Can, clubPolicy, Policies } from '../../src/core/authorization/policy.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import { EmailSender } from '../../src/core/email/email-sender.js';
import { LOG_STREAM } from '../../src/core/logging/logging.module.js';
import { FakeEmailSender, TEST_WEB_ORIGIN, uniqueEmail } from '../support/auth-fixtures.js';
import { as, type Cast, createCast } from '../support/club-cast.js';
import { createTestApp } from '../support/create-test-app.js';
import { LogCapture } from '../support/log-capture.js';

// The rest of the suite runs with logs off; this file reads them.
vi.hoisted(() => {
  process.env.LOG_LEVEL = 'info';
});

@Policies({ 'test.logging.read': clubPolicy({ allows: () => true }) })
@Controller('clubs/:clubId/test-logging')
class ClubLoggingController {
  @Can('test.logging.read')
  @Get()
  show() {
    return { ok: true };
  }
}

@Public()
@Controller('test/logging')
class FailingController {
  @Get('fail')
  fail(): never {
    throw new Error('lucia.prueba@example.test could not be loaded');
  }
}

@Module({ controllers: [ClubLoggingController, FailingController] })
class LoggingTestModule {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('Request logs (TECH-10, NFR-OBS-02)', () => {
  const logs = new LogCapture();
  const email = new FakeEmailSender();
  let app: INestApplication<App>;
  let cast: Cast;

  const clubPath = () => `/v1/clubs/${cast.club.id}/test-logging`;

  beforeAll(async () => {
    app = await createTestApp(
      (builder) =>
        builder
          .overrideProvider(LOG_STREAM)
          .useValue(logs)
          .overrideProvider(EmailSender)
          .useValue(email),
      [LoggingTestModule],
    );
    cast = await createCast(app.get(PrismaService));
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs a finished request with its request ID, user and club, and returns the ID', async () => {
    const { owner } = cast.actors;

    const response = await as(app, owner).get(clubPath()).expect(200);

    const requestId = response.headers['x-request-id'];
    expect(requestId).toMatch(UUID);
    await expect
      .poll(() => logs.requestLine(clubPath()))
      .toMatchObject({
        level: 'info',
        msg: 'request completed',
        req: { method: 'GET', path: clubPath() },
        res: { status: 200 },
        request_id: requestId,
        user_id: owner.userId,
        club_id: cast.club.id,
      });
  });

  it('gives every request its own ID, ignoring one the caller sends', async () => {
    const first = await request(app.getHttpServer())
      .get('/v1/app-config')
      .set('X-Request-Id', 'mine');
    const second = await request(app.getHttpServer()).get('/v1/app-config');

    expect(first.headers['x-request-id']).toMatch(UUID);
    expect(second.headers['x-request-id']).toMatch(UUID);
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
  });

  it("keeps query strings, headers and bodies out of the log, on Better Auth's routes too", async () => {
    const { owner } = cast.actors;
    const address = uniqueEmail('registro');
    const signIn = '/v1/auth/email-otp/send-verification-otp';

    await as(app, owner).get(`${clubPath()}?code=4821-query-secret`).expect(200);
    const response = await request(app.getHttpServer())
      .post(signIn)
      .set('Origin', TEST_WEB_ORIGIN)
      .set('Cookie', 'better-auth.session_token=cookie-secret')
      .send({ email: address, type: 'sign-in' })
      .expect(200);

    await expect
      .poll(() => logs.requestLine(signIn))
      .toMatchObject({
        req: { method: 'POST', path: signIn },
        res: { status: 200 },
        request_id: response.headers['x-request-id'],
      });
    expect(logs.text()).not.toContain('4821-query-secret');
    expect(logs.text()).not.toContain('cookie-secret');
    expect(logs.text()).not.toContain(owner.token);
    expect(logs.text()).not.toContain(address);
  });

  it('logs a server error at error level, with the same request ID on the error it logged', async () => {
    const response = await request(app.getHttpServer()).get('/v1/test/logging/fail').expect(500);
    const requestId = response.headers['x-request-id'];

    await expect
      .poll(() => logs.requestLine('/v1/test/logging/fail'))
      .toMatchObject({
        level: 'error',
        res: { status: 500 },
        request_id: requestId,
      });
    expect(logs.lines).toContainEqual(
      expect.objectContaining({
        level: 'error',
        context: 'ProblemDetailsFilter',
        request_id: requestId,
      }),
    );
    expect(logs.text()).not.toContain('lucia.prueba');
  });

  it('leaves health checks out', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer()).get('/health/ready').expect(200);

    expect(logs.requestLine('/health')).toBeUndefined();
    expect(logs.requestLine('/health/ready')).toBeUndefined();
  });
});
