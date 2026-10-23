import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import type { Env } from '../config/env.js';
import { PrismaService } from '../database/prisma.service.js';
import { EmailModule } from '../email/email.module.js';
import { EmailSender } from '../email/email-sender.js';
import { AuthGuard } from './auth.guard.js';
import { AUTH } from './auth.tokens.js';
import { type Auth, createAuth } from './create-auth.js';

@Module({
  imports: [EmailModule],
  providers: [
    {
      provide: AUTH,
      inject: [ConfigService, PrismaService, EmailSender],
      useFactory: (
        config: ConfigService<Env, true>,
        prisma: PrismaService,
        emailSender: EmailSender,
      ): Auth =>
        createAuth(
          {
            baseUrl: config.get('API_BASE_URL', { infer: true }),
            secret: config.get('BETTER_AUTH_SECRET', { infer: true }),
            webOrigins: config.get('WEB_ORIGINS', { infer: true }),
            googleClientIds: config.get('GOOGLE_CLIENT_IDS', { infer: true }),
            appleClientIds: config.get('APPLE_CLIENT_IDS', { infer: true }),
          },
          { prisma, emailSender, logger: new Logger('BetterAuth') },
        ),
    },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AUTH],
})
export class AuthModule {}
