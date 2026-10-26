import { configureApiClient } from '@repo/api-client';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { requireUpdate } from '@/lib/app-update';
import { locale } from '@/lib/i18n';
import { getSessionToken } from '@/lib/session';

const readApiUrl = () => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error('Set EXPO_PUBLIC_API_URL to the API origin');
  return url;
};

export const apiUrl = readApiUrl();

const authHeaders = (): Record<string, string> => {
  const token = getSessionToken();
  return token === null ? {} : { Authorization: `Bearer ${token}` };
};

export function setUpApiClient() {
  configureApiClient({
    baseUrl: apiUrl,
    appVersion: Application.nativeApplicationVersion ?? '0.0.0',
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    locale,
    credentials: 'omit',
    getAuthHeaders: authHeaders,
    onUpdateRequired: requireUpdate,
  });
}
