import { writeFile } from 'node:fs/promises';

import { NestFactory } from '@nestjs/core';

import { applyGlobalPrefix } from './core/configure-app.js';
import { createOpenApiDocument } from './core/contract/create-openapi-document.js';

const [outputPath] = process.argv.slice(2);
if (!outputPath) throw new Error('Usage: node dist/write-openapi.js <output path>');

// The env schema requires these at import time, but preview mode never connects or signs anything.
process.env.DATABASE_URL ??= 'postgresql://openapi@localhost:5432/openapi';
process.env.BETTER_AUTH_SECRET ??= 'openapi-document-only-never-used-0123456789';

const { AppModule } = await import('./app.module.js');
const app = await NestFactory.create(AppModule, { preview: true, logger: ['error'] });
applyGlobalPrefix(app);
const document = createOpenApiDocument(app);
await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`);
await app.close();
