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
      ): Auth => {
        const teamId = config.get('APPLE_TEAM_ID', { infer: true });
        const keyId = config.get('APPLE_KEY_ID', { infer: true });
        const privateKey = config.get('APPLE_PRIVATE_KEY', { infer: true });
        return createAuth(
          {
            baseUrl: config.get('API_BASE_URL', { infer: true }),
            secret: config.get('BETTER_AUTH_SECRET', { infer: true }),
            webOrigins: config.get('WEB_ORIGINS', { infer: true }),
            cookieDomain: config.get('AUTH_COOKIE_DOMAIN', { infer: true }),
            googleClientIds: config.get('GOOGLE_CLIENT_IDS', { infer: true }),
            googleClientSecret: config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
            appleClientIds: config.get('APPLE_CLIENT_IDS', { infer: true }),
            appleSigningKey:
              teamId && keyId && privateKey ? { teamId, keyId, privateKey } : undefined,
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
        );
      },
    },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AUTH],
})
export class AuthModule {}
