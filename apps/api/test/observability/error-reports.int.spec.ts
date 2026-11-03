import {
  Controller,
  Get,
  type INestApplication,
  Logger,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Can, clubPolicy, Policies } from '../../src/core/authorization/policy.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import { DomainError } from '../../src/core/errors/domain-error.js';
import { as, type Cast, createCast } from '../support/club-cast.js';
import { createTestApp } from '../support/create-test-app.js';
import { captureSentryEvents } from '../support/sentry-capture.js';

@Policies({ 'test.reports.read': clubPolicy({ allows: () => true }) })
@Controller('clubs/:clubId/test-reports')
class ReportsController {
  @Can('test.reports.read')
  @Get('crash')
  crash(): never {
    throw new Error('lucia.prueba@example.test could not be loaded');
  }

  @Can('test.reports.read')
  @Get('missing')
  missing(): never {
    throw new DomainError('NOT_FOUND');
  }

  @Can('test.reports.read')
  @Get('draining')
  draining(): never {
    throw new ServiceUnavailableException();
  }
}

@Module({ controllers: [ReportsController] })
class ReportsTestModule {}

describe('Errors reported to Sentry (TECH-10, NFR-OBS-01)', () => {
  const reported = captureSentryEvents();
  let app: INestApplication<App>;
  let cast: Cast;

  const path = (route: string) => `/v1/clubs/${cast.club.id}/test-reports/${route}`;

  beforeAll(async () => {
    app = await createTestApp(undefined, [ReportsTestModule]);
    cast = await createCast(app.get(PrismaService));
  });

  beforeEach(() => {
    reported.length = 0;
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports an unexpected error with the user, club and request ID, without its message', async () => {
    const { owner } = cast.actors;

    const response = await as(app, owner)
      .get(`${path('crash')}?code=4821`)
      .expect(500);

    await expect.poll(() => reported).toHaveLength(1);
    expect(reported[0]).toMatchObject({
      exception: { values: [{ type: 'Error' }] },
      user: { id: owner.userId },
      tags: { club_id: cast.club.id, request_id: response.headers['x-request-id'] },
    });
    expect(JSON.stringify(reported)).not.toMatch(/lucia\.prueba|4821/);
    expect(JSON.stringify(reported)).not.toContain(owner.token);
  });

  it('leaves out the errors the API answers on purpose', async () => {
    const { owner } = cast.actors;

    await as(app, owner).get(path('missing')).expect(404);
    await as(app, owner).get(path('draining')).expect(503);
    await as(app, owner).get(path('crash')).expect(500);

    await expect.poll(() => reported).toHaveLength(1);
    expect(reported[0]?.exception?.values?.[0]?.type).toBe('Error');
  });
});
