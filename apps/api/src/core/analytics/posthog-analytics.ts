import type { OnApplicationShutdown } from '@nestjs/common';
import type { AnalyticsEventName, AnalyticsEvents } from '@repo/contracts';
import type { PostHog } from 'posthog-node';

import { Analytics } from './analytics.js';

export class PostHogAnalytics extends Analytics implements OnApplicationShutdown {
  constructor(private readonly client: PostHog) {
    super();
  }

  capture<Event extends AnalyticsEventName>(
    userId: string,
    event: Event,
    properties: AnalyticsEvents[Event],
  ): void {
    this.client.capture({ distinctId: userId, event, properties, disableGeoip: true });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.shutdown();
  }
}
