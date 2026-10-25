import { configureApiClient } from '@repo/api-client';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { locale } from '@/lib/i18n';

export function setUpApiClient() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new Error('Set EXPO_PUBLIC_API_URL to the API origin');

  configureApiClient({
    baseUrl,
    appVersion: Application.nativeApplicationVersion ?? '0.0.0',
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    locale,
  });
}
