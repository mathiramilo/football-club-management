import { configureApiClient } from '@repo/api-client';

import { locale } from '@/i18n/locale';
import { requireUpdate } from '@/lib/app-update';

export function apiUrl() {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error('Set NEXT_PUBLIC_API_URL to the API origin');
  return url;
}

export function setUpApiClient() {
  configureApiClient({
    baseUrl: apiUrl(),
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
    platform: 'web',
    locale,
    credentials: 'include',
    onUpdateRequired: requireUpdate,
  });
}
