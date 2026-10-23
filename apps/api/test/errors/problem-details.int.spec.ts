import { randomUUID } from 'node:crypto';

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  type INestApplication,
  Logger,
  Module,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Public } from '../../src/core/auth/public.decorator.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import { DomainError } from '../../src/core/errors/domain-error.js';
import { WhoAmIModule } from '../support/auth-fixtures.js';
import { createTestApp } from '../support/create-test-app.js';

const SECRET = 'player-note-4812';

const profileBody = z.object({
  name: z.string().min(1),
  profile: z.object({
    'shirt/size': z.enum(['s', 'm', 'l']),
  }),
  reason: z
    .string()
    .optional()
    .refine((reason) => reason !== 'none', { message: 'REASON_REQUIRED' }),
});

@Public()
@Controller('test/problems')
class ProblemsTestController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('domain')
  domain() {
    throw new DomainError('CONFLICT', 'The event changed while you were editing it');
  }

  @Get('http')
  http() {
    throw new ForbiddenException('Internal reason that must not leak');
  }

  @Get('http-with-code')
  httpWithCode() {
    throw new ForbiddenException('Not yours', { errorCode: 'NOT_FOUND' });
  }

  @Get('unexpected')
  unexpected() {
    throw new Error(`Query failed for note ${SECRET}`);
  }

  @Post('duplicate-user')
  async duplicateUser() {
    const email = `duplicate-${randomUUID()}@example.test`;
    await this.prisma.user.create({ data: { email } });
    await this.prisma.user.create({ data: { email } });
  }

  @Post('missing-user')
  async missingUser() {
    await this.prisma.user.update({ where: { id: randomUUID() }, data: { name: 'Nadie' } });
  }

  @Post('profiles')
  createProfile(@Body({ schema: profileBody }) body: z.infer<typeof profileBody>) {
    return body;
  }

  @Get('items/:itemId')
  item(
    @Param('itemId', { schema: z.uuid() }) itemId: string,
    @Query('limit', { schema: z.coerce.number().int().max(200).optional() }) limit?: number,
  ) {
    return { itemId, limit };
  }
}

@Module({ controllers: [ProblemsTestController] })
class ProblemsTestModule {}

describe('problem+json errors (TECH-06)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp(undefined, [ProblemsTestModule, WhoAmIModule]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers a domain error with its catalog status and code', async () => {
    const response = await http().get('/v1/test/problems/domain').expect(409);

    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.body).toEqual({
      type: '/problems/conflict',
      title: 'Conflict',
      status: 409,
      code: 'CONFLICT',
      detail: 'The event changed while you were editing it',
    });
  });

  it('lists every invalid body field with its pointer and code', async () => {
    const response = await http()
      .post('/v1/test/problems/profiles')
      .send({ name: '', profile: { 'shirt/size': 'xl' }, reason: 'none' })
      .expect(400);

    expect(response.body).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      errors: [
        expect.objectContaining({ in: 'body', pointer: '/name', code: 'too_small' }),
        expect.objectContaining({
          in: 'body',
          pointer: '/profile/shirt~1size',
          code: 'invalid_value',
        }),
        { in: 'body', pointer: '/reason', code: 'REASON_REQUIRED' },
      ],
    });
  });

  it('reports invalid path and query parameters by where they came from', async () => {
    const path = await http().get('/v1/test/problems/items/not-a-uuid').expect(400);
    expect(path.body).toMatchObject({
      errors: [expect.objectContaining({ in: 'path', pointer: '', code: 'invalid_format' })],
    });

    const itemId = '0199f7a2-7c1e-7d3a-9c55-2f0a6c1b9e01';
    const query = await http().get(`/v1/test/problems/items/${itemId}?limit=500`).expect(400);
    expect(query.body).toMatchObject({
      errors: [expect.objectContaining({ in: 'query', pointer: '', code: 'too_big' })],
    });

    await http()
      .get(`/v1/test/problems/items/${itemId}?limit=50`)
      .expect(200, { itemId, limit: 50 });
  });

  it('maps a Nest HTTP exception to a generic code for its status, without its message', async () => {
    const response = await http().get('/v1/test/problems/http').expect(403);

    expect(response.body).toEqual({
      type: '/problems/forbidden',
      title: 'Not allowed',
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  it('keeps the catalog code an HTTP exception declares', async () => {
    const response = await http().get('/v1/test/problems/http-with-code').expect(403);

    expect(response.body).toMatchObject({ status: 403, code: 'NOT_FOUND' });
  });

  it('maps a unique violation to CONFLICT and a missing record to NOT_FOUND', async () => {
    const duplicate = await http().post('/v1/test/problems/duplicate-user').expect(409);
    expect(duplicate.body).toMatchObject({ code: 'CONFLICT' });

    const missing = await http().post('/v1/test/problems/missing-user').expect(404);
    expect(missing.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('answers a request without a session with UNAUTHENTICATED', async () => {
    const response = await http().get('/v1/test/whoami').expect(401);

    expect(response.body).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });

  it('answers an unknown route with NOT_FOUND', async () => {
    const response = await http().get('/v1/no-such-route').expect(404);

    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.body).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('answers malformed JSON with BAD_REQUEST', async () => {
    const response = await http()
      .post('/v1/test/problems/profiles')
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400);

    expect(response.body).toMatchObject({ status: 400, code: 'BAD_REQUEST' });
  });

  it('hides an unexpected error from the response and its message from the log', async () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    try {
      const response = await http().get('/v1/test/problems/unexpected').expect(500);

      expect(response.body).toEqual({
        type: '/problems/internal-error',
        title: 'Internal error',
        status: 500,
        code: 'INTERNAL_ERROR',
      });
      expect(logged).toHaveBeenCalledWith('Unhandled Error', expect.stringContaining('    at '));
      expect(JSON.stringify(logged.mock.calls)).not.toContain(SECRET);
    } finally {
      logged.mockRestore();
    }
  });
});
