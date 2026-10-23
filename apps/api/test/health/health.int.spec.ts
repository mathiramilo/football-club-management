import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { HealthController } from '../../src/core/health/health.controller.js';
import { createTestApp } from '../support/create-test-app.js';

describe('GET /health (NFR-OBS-04)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports that the process is up', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('stays outside the versioned prefix', async () => {
    await request(app.getHttpServer()).get('/v1/health').expect(404);
  });
});

describe('GET /health/ready (TECH-03)', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    await app.close();
  });

  it('reports ready when the database answers', async () => {
    app = await createTestApp();

    const response = await request(app.getHttpServer()).get('/health/ready').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('reports not ready when the database is unreachable', async () => {
    const unreachable = new PrismaService('postgresql://postgres:postgres@127.0.0.1:1/unreachable');
    app = await createTestApp((builder) =>
      builder.overrideProvider(PrismaService).useValue(unreachable),
    );

    await request(app.getHttpServer()).get('/health/ready').expect(503);
  });

  it('reports not ready once the app starts shutting down', async () => {
    app = await createTestApp();

    app.get(HealthController).beforeApplicationShutdown();

    await request(app.getHttpServer()).get('/health/ready').expect(503);
  });
});
