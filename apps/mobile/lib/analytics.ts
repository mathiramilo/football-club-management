import type { AnalyticsEventName, AnalyticsEvents } from '@repo/contracts';
import PostHog from 'posthog-react-native';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'analytics' });

const createClient = (apiKey: string) =>
  new PostHog(apiKey, {
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    customStorage: {
      getItem: (key) => storage.getString(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      },
    },
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    preloadFeatureFlags: false,
    disableRemoteConfig: true,
    disableSurveys: true,
    personProfiles: 'identified_only',
    setDefaultPersonProperties: false,
  });

let client: PostHog | undefined;

const analytics = () => {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return undefined;
  client ??= createClient(apiKey);
  return client;
};

export function track<Event extends AnalyticsEventName>(
  event: Event,
  properties: AnalyticsEvents[Event],
) {
  analytics()?.capture(event, properties);
}

export function identifyAnalyticsUser(userId: string) {
  analytics()?.identify(userId);
}

export function resetAnalytics() {
  analytics()?.reset();
}
