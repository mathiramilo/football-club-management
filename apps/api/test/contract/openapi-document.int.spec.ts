import { randomUUID } from 'node:crypto';

import {
  Body,
  Controller,
  Get,
  HttpStatus,
  type INestApplication,
  Logger,
  Module,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, type OpenAPIObject } from '@nestjs/swagger';
import { errorCode, extensibleEnum } from '@repo/contracts';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Public } from '../../src/core/auth/public.decorator.js';
import { Can, Policies } from '../../src/core/authorization/policy.js';
import { createOpenApiDocument } from '../../src/core/contract/create-openapi-document.js';
import { ResponseSchema } from '../../src/core/contract/response-schema.decorator.js';
import { createTestApp } from '../support/create-test-app.js';
import { SIGNED_IN_TEST_ACTION, signedInTestPolicies } from '../support/test-policies.js';

const thingColor = z.enum(['red', 'green']).meta({ id: 'TestThingColor' });
const createThingBody = z
  .object({ name: z.string().min(1), color: thingColor })
  .meta({ id: 'TestCreateThingBody' });
const thing = z
  .object({
    id: z.uuid(),
    name: z.string(),
    color: thingColor,
    status: extensibleEnum(['draft', 'published']),
  })
  .meta({ id: 'TestThing' });
const listThingsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

@ApiTags('test-things')
@Policies(signedInTestPolicies)
@Controller('test/things')
class TestThingsController {
  @Public()
  @Post()
  @ResponseSchema(thing, { status: HttpStatus.CREATED })
  create(@Body({ schema: createThingBody }) { color }: z.infer<typeof createThingBody>) {
    return {
      id: randomUUID(),
      name: 'Conos',
      color: color === 'red' ? 'red' : 'green',
      status: 'draft',
      internalNote: 'never leaves the API',
    };
  }

  @Can(SIGNED_IN_TEST_ACTION)
  @Get()
  list(@Query({ schema: listThingsQuery }) query: z.infer<typeof listThingsQuery>) {
    return { items: [], query };
  }

  @Public()
  @Get('broken')
  @ResponseSchema(thing)
  broken() {
    return { id: 'not-a-uuid' };
  }
}

@Module({ controllers: [TestThingsController] })
class TestThingsModule {}

describe('OpenAPI document and response schemas (TECH-06, NFR-MAINT-03)', () => {
  let app: INestApplication<App>;
  let document: OpenAPIObject;
  const http = () => request(app.getHttpServer());
  const operations = () =>
    Object.values(document.paths).flatMap((path) =>
      [path.get, path.post, path.put, path.patch, path.delete].filter((operation) => !!operation),
    );

  beforeAll(async () => {
    app = await createTestApp(undefined, [TestThingsModule]);
    document = createOpenApiDocument(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('names each operation after its controller and method', () => {
    expect(document.paths['/v1/test/things']?.post?.operationId).toBe('testThingsCreate');
    expect(document.paths['/v1/test/things']?.get?.operationId).toBe('testThingsList');
    expect(document.paths['/v1/test/things']?.post?.tags).toEqual(['test-things']);
  });

  it('documents request and response schemas from the Zod contracts', () => {
    const create = document.paths['/v1/test/things']?.post;
    expect(create?.requestBody).toMatchObject({
      required: true,
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/TestCreateThingBody' } },
      },
    });
    expect(create?.responses['201']).toMatchObject({
      content: { 'application/json': { schema: { $ref: '#/components/schemas/TestThing' } } },
    });
    expect(document.paths['/v1/test/things/broken']?.get?.responses).toHaveProperty('200');
    expect(document.paths['/v1/test/things']?.get?.parameters).toEqual([
      expect.objectContaining({ name: 'cursor', in: 'query', required: false }),
      expect.objectContaining({ name: 'limit', in: 'query', required: false }),
    ]);
  });

  it('documents every error as problem+json', () => {
    for (const operation of operations()) {
      expect(operation.responses.default).toMatchObject({
        content: {
          'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } },
        },
      });
    }
    expect(document.components?.schemas?.ProblemDetails).toMatchObject({
      required: ['type', 'title', 'status', 'code'],
    });
  });

  it('lists growing enums as extensible, so adding a value is not a breaking change', () => {
    const schemas = document.components?.schemas ?? {};
    expect(schemas.ProblemDetails).toHaveProperty(
      ['properties', 'code', 'x-extensible-enum'],
      errorCode.options,
    );
    expect(schemas.ProblemDetails).not.toHaveProperty('properties.code.enum');
    expect(schemas.TestThing).toMatchObject({
      properties: { status: { 'x-extensible-enum': ['draft', 'published'] } },
    });
    expect(schemas.TestThingColor).toMatchObject({ enum: ['red', 'green'] });
  });

  it('requires a session token or cookie on every operation except public ones', () => {
    expect(document.security).toEqual([{ bearer: [] }, { cookie: [] }]);
    expect(document.paths['/v1/test/things']?.get).not.toHaveProperty('security');
    expect(document.paths['/v1/test/things']?.post?.security).toEqual([]);
    expect(JSON.stringify(document)).not.toContain('x-public');
  });

  it('leaves the health checks and the Better Auth routes out', () => {
    const paths = Object.keys(document.paths);
    expect(
      paths.filter((path) => path.startsWith('/health') || path.startsWith('/v1/auth')),
    ).toEqual([]);
  });

  it('strips response fields the schema does not declare', async () => {
    const response = await http()
      .post('/v1/test/things')
      .send({ name: 'Conos', color: 'red' })
      .expect(201);

    expect(response.body).toMatchObject({ name: 'Conos', color: 'red', status: 'draft' });
    expect(response.body).not.toHaveProperty('internalNote');
  });

  it('answers 500 when a handler returns a body its schema rejects', async () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    try {
      const response = await http().get('/v1/test/things/broken').expect(500);

      expect(response.body).toMatchObject({ code: 'INTERNAL_ERROR' });
    } finally {
      logged.mockRestore();
    }
  });
});
