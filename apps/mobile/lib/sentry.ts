import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

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
      return { ...breadcrumb, data: { ...breadcrumb.data, url: url.split('?')[0] } };
    },
  });
}

export const withSentry = Sentry.wrap;
