import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

import { restoreObservedUser } from '@/lib/observed-user';

const TOKEN_PATH = /\/(e|j|c|consent)\/[^/]+/;

const scrubUrl = (url: string) => (url.split(/[?#]/)[0] ?? '').replace(TOKEN_PATH, '/$1/:token');

export function setUpSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const channel = Updates.channel ?? '';

  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment: channel === '' ? 'development' : channel,
    attachScreenshot: false,
    attachViewHierarchy: false,
    reportAccessibilityIdentifier: false,
    beforeBreadcrumb: (breadcrumb) => {
      if (breadcrumb.category === 'console') return null;
      const url: unknown = breadcrumb.data?.url;
      if (typeof url !== 'string') return breadcrumb;
      return { ...breadcrumb, data: { ...breadcrumb.data, url: scrubUrl(url) } };
    },
    beforeSend: (event) => {
      for (const exception of event.exception?.values ?? []) delete exception.value;
      if (event.user) event.user = event.user.id === undefined ? undefined : { id: event.user.id };
      return event;
    },
  });
  restoreObservedUser();
}

export const withSentry = Sentry.wrap;
