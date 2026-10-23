import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import type { Env } from './core/config/env.js';
import { configureApp } from './core/configure-app.js';

const app = await NestFactory.create(AppModule);
configureApp(app);
app.enableShutdownHooks();
await app.listen(app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true }));
