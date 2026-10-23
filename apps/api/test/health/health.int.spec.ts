import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { SHUTDOWN_DRAIN_MS } from '../../src/core/health/readiness.service.js';
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
  it('reports ready when the database answers', async () => {
    const app = await createTestApp();
    try {
      const response = await request(app.getHttpServer()).get('/health/ready').expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    } finally {
      await app.close();
    }
  });

  it('reports not ready when the database is unreachable', async () => {
    const unreachable = new PrismaService('postgresql://postgres:postgres@127.0.0.1:1/unreachable');
    const app = await createTestApp((builder) =>
      builder.overrideProvider(PrismaService).useValue(unreachable),
    );
    try {
      await request(app.getHttpServer()).get('/health/ready').expect(503);
    } finally {
      await app.close();
    }
  });

  it('reports not ready while the app drains before closing', async () => {
    const app = await createTestApp((builder) =>
      builder.overrideProvider(SHUTDOWN_DRAIN_MS).useValue(1_000),
    );
    const server = app.getHttpServer();

    const closing = app.close();
    await request(server).get('/health/ready').expect(503);
    await request(server).get('/health').expect(200);
    await closing;
  });
});
