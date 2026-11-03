import type { AnalyticsEventName, AnalyticsEvents } from '@repo/contracts';

export abstract class Analytics {
  abstract capture<Event extends AnalyticsEventName>(
    userId: string,
    event: Event,
    properties: AnalyticsEvents[Event],
  ): void;
}

export class NoAnalytics extends Analytics {
  capture(): void {
    return;
  }
}
