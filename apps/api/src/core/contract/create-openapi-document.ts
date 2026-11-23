import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  type SchemaObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { EXTENSIBLE_ENUM, problemDetails } from '@repo/contracts';
import { z } from 'zod';

import { PUBLIC_OPERATION_EXTENSION } from '../auth/public.decorator.js';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);
const upperFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const operationIdOf = (controllerKey: string, methodKey: string) =>
  `${lowerFirst(controllerKey.replace(/Controller$/, ''))}${upperFirst(methodKey)}`;

function openPublicOperations(document: OpenAPIObject): void {
  for (const path of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = path[method];
      if (operation && PUBLIC_OPERATION_EXTENSION in operation) {
        Reflect.deleteProperty(operation, PUBLIC_OPERATION_EXTENSION);
        operation.security = [];
      }
    }
  }
}

// Club routes read :clubId in the club context guard, not through @Param, so Swagger never sees it.
// Every route ID is a UUID (API guidelines § 2).
function declarePathParameters(document: OpenAPIObject): void {
  for (const [route, path] of Object.entries(document.paths)) {
    const names = [...route.matchAll(/\{(\w+)\}/g)].flatMap(([, name]) => name ?? []);
    for (const method of HTTP_METHODS) {
      const operation = path[method];
      if (!operation) continue;
      const parameters = (operation.parameters ??= []);
      for (const name of names) {
        const declared = parameters.some(
          (parameter) => 'in' in parameter && parameter.in === 'path' && parameter.name === name,
        );
        if (!declared) {
          parameters.push({
            name,
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          });
        }
      }
    }
  }
}

function listExtensibleEnums(node: unknown): void {
  if (typeof node !== 'object' || node === null) return;
  if (Array.isArray(node)) {
    node.forEach(listExtensibleEnums);
    return;
  }
  const schema = node as Record<string, unknown>;
  if (schema[EXTENSIBLE_ENUM] === true && Array.isArray(schema.enum)) {
    schema[EXTENSIBLE_ENUM] = schema.enum;
    delete schema.enum;
  }
  Object.values(schema).forEach(listExtensibleEnums);
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Football Club Management API')
    .setVersion('1')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'opaque',
      description: 'Session token (mobile)',
    })
    .addCookieAuth(
      'better-auth.session_token',
      {
        type: 'apiKey',
        in: 'cookie',
        description: 'Session cookie (web), `__Secure-` prefixed over HTTPS',
      },
      'cookie',
    )
    .addSecurityRequirements('bearer')
    .addSecurityRequirements('cookie')
    .addGlobalResponse({
      status: 'default',
      description: 'Problem details (RFC 9457)',
      content: {
        'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } },
      },
    })
    .build();

  const document = SwaggerModule.createDocument(app, config, { operationIdFactory: operationIdOf });
  openPublicOperations(document);
  declarePathParameters(document);
  document.components = {
    ...document.components,
    schemas: {
      ...document.components?.schemas,
      // Zod's JSON Schema type also allows boolean subschemas, which Swagger's SchemaObject doesn't model.
      ProblemDetails: z.toJSONSchema(problemDetails, { target: 'openapi-3.0' }) as SchemaObject,
    },
  };
  listExtensibleEnums(document);
  return document;
}
