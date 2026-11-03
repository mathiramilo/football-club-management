import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

import type { Env } from '../config/env.js';
import { Analytics, NoAnalytics } from './analytics.js';
import { PostHogAnalytics } from './posthog-analytics.js';

@Module({
  providers: [
    {
      provide: Analytics,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): Analytics => {
        const apiKey = config.get('POSTHOG_API_KEY', { infer: true });
        if (!apiKey) return new NoAnalytics();
        return new PostHogAnalytics(
          new PostHog(apiKey, { host: config.get('POSTHOG_HOST', { infer: true }) }),
        );
      },
    },
  ],
  exports: [Analytics],
})
export class AnalyticsModule {}
