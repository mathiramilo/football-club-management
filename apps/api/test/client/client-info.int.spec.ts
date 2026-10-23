import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, it } from 'vitest';

import { Public } from '../../src/core/auth/public.decorator.js';
import type { RequestContext } from '../../src/core/request-context.js';
import { createTestApp } from '../support/create-test-app.js';

@Public()
@Controller('test/client')
class ClientTestController {
  constructor(private readonly cls: ClsService<RequestContext>) {}

  @Get()
  client() {
    return this.cls.get('client');
  }
}

@Module({ controllers: [ClientTestController] })
class ClientTestModule {}

describe('X-App-Version and X-Platform (TECH-06)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp(undefined, [ClientTestModule]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('puts the app version and platform in the request context', async () => {
    await request(app.getHttpServer())
      .get('/v1/test/client')
      .set('X-App-Version', '1.3.0')
      .set('X-Platform', 'android')
      .expect(200, { platform: 'android', appVersion: '1.3.0' });
  });

  it('serves a request without them', async () => {
    await request(app.getHttpServer()).get('/v1/test/client').expect(200, {});
  });
});
