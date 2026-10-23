import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { Clock, ClockModule } from '../clock/clock.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../database/prisma.service.js';
import { EmailModule } from '../email/email.module.js';
import { EmailSender } from '../email/email-sender.js';
import { AuthGuard } from './auth.guard.js';
import { AUTH } from './auth.tokens.js';
import { type Auth, createAuth } from './create-auth.js';
import { EmailCodeRequestsRepository } from './email-code-requests.repository.js';

@Module({
  imports: [EmailModule, ClockModule],
  providers: [
    EmailCodeRequestsRepository,
    {
      provide: AUTH,
      inject: [ConfigService, PrismaService, EmailSender, EmailCodeRequestsRepository, Clock],
      useFactory: (
        config: ConfigService<Env, true>,
        prisma: PrismaService,
        emailSender: EmailSender,
        emailCodeRequests: EmailCodeRequestsRepository,
        clock: Clock,
      ): Auth =>
        createAuth(
          {
            baseUrl: config.get('API_BASE_URL', { infer: true }),
            secret: config.get('BETTER_AUTH_SECRET', { infer: true }),
            webOrigins: config.get('WEB_ORIGINS', { infer: true }),
            googleClientIds: config.get('GOOGLE_CLIENT_IDS', { infer: true }),
            appleClientIds: config.get('APPLE_CLIENT_IDS', { infer: true }),
            rateLimitEnabled: config.get('AUTH_RATE_LIMIT_ENABLED', { infer: true }),
            trustedProxies: config.get('AUTH_TRUSTED_PROXIES', { infer: true }),
          },
          {
            prisma,
            emailSender,
            emailCodeRequests,
            clock,
            logger: new Logger('BetterAuth'),
          },
        ),
    },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AUTH],
})
export class AuthModule {}
