import 'server-only';

import {
  ApiError,
  configureApiClient,
  type InvitePreview,
  publicInvitesPreview,
} from '@repo/api-client';
import { cache } from 'react';

import { locale } from '@/i18n/locale';

function setUpAnonymousClient() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) throw new Error('Set NEXT_PUBLIC_API_URL to the API origin');
  configureApiClient({
    baseUrl,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
    platform: 'web',
    locale,
  });
}

export const getInvitePreview = cache(async (token: string): Promise<InvitePreview | null> => {
  setUpAnonymousClient();
  try {
    return await publicInvitesPreview(encodeURIComponent(token), { cache: 'no-store' });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
});
