import type { AnalyticsEventName, AnalyticsEvents } from '@repo/contracts';

import { Analytics } from '../../src/core/analytics/analytics.js';

export class FakeAnalytics extends Analytics {
  readonly captured: { userId: string; event: AnalyticsEventName; properties: object }[] = [];

  capture<Event extends AnalyticsEventName>(
    userId: string,
    event: Event,
    properties: AnalyticsEvents[Event],
  ): void {
    this.captured.push({ userId, event, properties });
  }
}
