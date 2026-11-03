import type { AnalyticsEventName, AnalyticsEvents } from '@repo/contracts';
import type { CaptureResult, PostHog, PostHogConfig } from 'posthog-js';

import { scrubUrl } from './scrub-url';

const URL_PROPERTY = /url|pathname|referrer/i;

function scrubProperties(properties: Record<string, unknown> | undefined) {
  if (!properties) return properties;
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      URL_PROPERTY.test(key) && typeof value === 'string' ? scrubUrl(value) : value,
    ]),
  );
}

function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  return {
    ...event,
    properties: scrubProperties(event.properties) ?? {},
    $set: scrubProperties(event.$set),
    $set_once: scrubProperties(event.$set_once),
  };
}

const config: Partial<PostHogConfig> = {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  capture_performance: false,
  capture_heatmaps: false,
  capture_dead_clicks: false,
  capture_exceptions: false,
  rageclick: false,
  disable_session_recording: true,
  disable_surveys: true,
  disable_product_tours: true,
  disable_conversations: true,
  disable_web_experiments: true,
  disable_external_dependency_loading: true,
  advanced_disable_flags: true,
  mask_all_text: true,
  save_referrer: false,
  save_campaign_params: false,
  person_profiles: 'identified_only',
  persistence: 'localStorage',
  before_send: scrubEvent,
};

let loading: Promise<PostHog> | undefined;

export function loadAnalytics(): Promise<PostHog> | undefined {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return undefined;
  loading ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, config);
    return posthog;
  });
  return loading;
}

export function track<Event extends AnalyticsEventName>(
  event: Event,
  properties: AnalyticsEvents[Event],
) {
  void loadAnalytics()?.then((posthog) => {
    posthog.capture(event, properties, { transport: 'sendBeacon' });
  });
}

export function identifyUser(userId: string) {
  void loadAnalytics()?.then((posthog) => {
    posthog.identify(userId);
  });
}

export function resetAnalytics() {
  void loadAnalytics()?.then((posthog) => {
    posthog.reset();
  });
}
