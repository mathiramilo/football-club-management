import * as Sentry from '@sentry/react-native';
import { createMMKV } from 'react-native-mmkv';

import { identifyAnalyticsUser, resetAnalytics } from '@/lib/analytics';

const storage = createMMKV({ id: 'observed-user' });
const userIdKey = 'user-id';

export function observeUser(userId: string) {
  storage.set(userIdKey, userId);
  Sentry.setUser({ id: userId });
  identifyAnalyticsUser(userId);
}

export function forgetUser() {
  storage.remove(userIdKey);
  Sentry.setUser(null);
  resetAnalytics();
}

export function restoreObservedUser() {
  const userId = storage.getString(userIdKey);
  if (userId) Sentry.setUser({ id: userId });
}
