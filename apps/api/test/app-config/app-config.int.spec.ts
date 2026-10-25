import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import type { Platform } from '@repo/contracts';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { APP_CONFIG_CACHE_MS } from '../../src/core/app-config/app-config.service.js';
import { Public } from '../../src/core/auth/public.decorator.js';
import { Can, Policies } from '../../src/core/authorization/policy.js';
import { Clock } from '../../src/core/clock/clock.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import { createTestApp } from '../support/create-test-app.js';
import { FakeClock } from '../support/fake-clock.js';
import { SIGNED_IN_TEST_ACTION, signedInTestPolicies } from '../support/test-policies.js';

@Policies(signedInTestPolicies)
@Controller('test/app-version')
class AppVersionTestController {
  @Public()
  @Get('public')
  open() {
    return { served: true };
  }

  @Can(SIGNED_IN_TEST_ACTION)
  @Get('signed-in')
  signedIn() {
    return { served: true };
  }
}

@Module({ controllers: [AppVersionTestController] })
class AppVersionTestModule {}

// Every test file shares one database, and other files send real versions such as 1.3.0.
// Minimums here stay below any of them, so a parallel file is never refused.
const MINIMUM = '0.5.0';
const IOS_STORE_URL = 'https://apps.apple.com/app/id0000000000';

describe('App versions (TECH-14)', () => {
  const clock = new FakeClock(new Date('2026-10-25T12:00:00Z'));
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());
  const asApp = (platform: string, version: string) => (path: string) =>
    http().get(path).set('X-Platform', platform).set('X-App-Version', version);

  const configure = async (
    platform: Platform,
    data: { minimumVersion?: string; storeUrl?: string },
  ) => {
    await prisma.appConfig.update({ where: { platform }, data });
    clock.advance(APP_CONFIG_CACHE_MS);
  };

  beforeAll(async () => {
    app = await createTestApp(
      (builder) => builder.overrideProvider(Clock).useValue(clock),
      [AppVersionTestModule],
    );
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.appConfig.updateMany({ data: { minimumVersion: null, storeUrl: null } });
    clock.advance(APP_CONFIG_CACHE_MS);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/app-config', () => {
    it('answers without a session, and serves every version until a minimum is set', async () => {
      const response = await http().get('/v1/app-config').expect(200);

      expect(response.body).toEqual({
        minimumVersions: { ios: null, android: null, web: null },
        updateRequired: false,
        storeUrls: { ios: null, android: null },
      });
    });

    it('is never cached, since the answer depends on the calling app', async () => {
      await http().get('/v1/app-config').expect(200).expect('Cache-Control', 'no-store');
    });

    it('drops a store link that is not a valid URL instead of failing', async () => {
      await configure('ios', { minimumVersion: MINIMUM, storeUrl: 'https://' });

      const response = await asApp('ios', '0.4.0')('/v1/app-config').expect(200);

      expect(response.body).toMatchObject({
        updateRequired: true,
        storeUrls: { ios: null, android: null },
      });
    });

    it('tells an app below its minimum to update, and where', async () => {
      await configure('ios', { minimumVersion: MINIMUM, storeUrl: IOS_STORE_URL });

      const response = await asApp('ios', '0.4.0')('/v1/app-config').expect(200);

      expect(response.body).toEqual({
        minimumVersions: { ios: MINIMUM, android: null, web: null },
        updateRequired: true,
        storeUrls: { ios: IOS_STORE_URL, android: null },
      });
    });

    it('does not ask an app at its minimum to update', async () => {
      await configure('ios', { minimumVersion: MINIMUM });

      const response = await asApp('ios', MINIMUM)('/v1/app-config').expect(200);

      expect(response.body).toMatchObject({ updateRequired: false });
    });
  });

  describe('Minimum versions on every route', () => {
    it('answers 426 APP_UPDATE_REQUIRED to a version below its platform minimum', async () => {
      await configure('ios', { minimumVersion: MINIMUM });

      const response = await asApp(
        'ios',
        '0.4.9',
      )('/v1/test/app-version/public')
        .expect(426)
        .expect('Content-Type', /application\/problem\+json/);

      expect(response.body).toMatchObject({
        status: 426,
        code: 'APP_UPDATE_REQUIRED',
        type: '/problems/app-update-required',
      });
    });

    it('ranks a pre-release below its release', async () => {
      await configure('ios', { minimumVersion: MINIMUM });

      await asApp('ios', '0.5.0-rc.1')('/v1/test/app-version/public').expect(426);
    });

    it.each([
      { case: 'the minimum itself', headers: { 'X-Platform': 'ios', 'X-App-Version': MINIMUM } },
      { case: 'a newer version', headers: { 'X-Platform': 'ios', 'X-App-Version': '1.3.0' } },
      {
        case: 'another platform, which has no minimum',
        headers: { 'X-Platform': 'android', 'X-App-Version': '0.4.0' },
      },
      { case: 'no client headers', headers: {} },
      {
        case: 'a version that does not parse',
        headers: { 'X-Platform': 'ios', 'X-App-Version': '0.4' },
      },
      {
        case: 'an unknown platform',
        headers: { 'X-Platform': 'windows', 'X-App-Version': '0.4.0' },
      },
      { case: 'a version without a platform', headers: { 'X-App-Version': '0.4.0' } },
    ])('serves $case', async ({ headers }) => {
      await configure('ios', { minimumVersion: MINIMUM });

      await http().get('/v1/test/app-version/public').set(headers).expect(200);
    });

    it('answers 426 before it checks the session', async () => {
      await configure('ios', { minimumVersion: MINIMUM });

      const outdated = await asApp('ios', '0.4.0')('/v1/test/app-version/signed-in').expect(426);
      const current = await asApp('ios', MINIMUM)('/v1/test/app-version/signed-in').expect(401);

      expect(outdated.body).toMatchObject({ code: 'APP_UPDATE_REQUIRED' });
      expect(current.body).toMatchObject({ code: 'UNAUTHENTICATED' });
    });

    it('serves the health checks to every version', async () => {
      await configure('ios', { minimumVersion: MINIMUM });

      await asApp('ios', '0.4.0')('/health').expect(200);
    });

    it('rereads the minimums when the clock steps back', async () => {
      const outdated = asApp('ios', '0.4.0');
      await outdated('/v1/test/app-version/public').expect(200);

      await prisma.appConfig.update({
        where: { platform: 'ios' },
        data: { minimumVersion: MINIMUM },
      });
      clock.advance(-30 * 60_000);

      await outdated('/v1/test/app-version/public').expect(426);
    });

    it('applies a raised minimum within a minute', async () => {
      const outdated = asApp('ios', '0.4.0');
      await outdated('/v1/test/app-version/public').expect(200);

      await prisma.appConfig.update({
        where: { platform: 'ios' },
        data: { minimumVersion: MINIMUM },
      });
      await outdated('/v1/test/app-version/public').expect(200);

      clock.advance(APP_CONFIG_CACHE_MS);
      await outdated('/v1/test/app-version/public').expect(426);
    });
  });
});
