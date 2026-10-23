import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import { EmailSender } from './email-sender.js';
import { MailpitEmailSender } from './mailpit-email-sender.js';

@Module({
  providers: [
    {
      provide: EmailSender,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): EmailSender =>
        new MailpitEmailSender(
          config.get('MAILPIT_URL', { infer: true }),
          config.get('EMAIL_FROM', { infer: true }),
        ),
    },
  ],
  exports: [EmailSender],
})
export class EmailModule {}
