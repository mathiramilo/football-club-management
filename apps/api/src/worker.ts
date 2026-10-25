import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module.js';

const worker = await NestFactory.createApplicationContext(WorkerModule);
worker.enableShutdownHooks();
