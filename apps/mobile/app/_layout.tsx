import '@/global.css';

import { useAppConfigGet } from '@repo/api-client';
import { useIsRestoring } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { IntlProvider } from 'react-intl';

import { QueryProvider } from '@/components/query-provider';
import { setUpApiClient } from '@/lib/api-client';
import { useUpdateRequiredAt } from '@/lib/app-update';
import { useAppFonts } from '@/lib/fonts';
import { locale, messages } from '@/lib/i18n';
import { setUpSentry, withSentry } from '@/lib/sentry';
import { useIsSignedIn } from '@/lib/session';

void SplashScreen.preventAutoHideAsync();
setUpSentry();
setUpApiClient();

const appConfigStaleTimeMs = 60 * 60 * 1000;

function useMustUpdate() {
  const { data, dataUpdatedAt } = useAppConfigGet({ query: { staleTime: appConfigStaleTimeMs } });
  const rejectedAt = useUpdateRequiredAt();
  if (data !== undefined && (rejectedAt === null || dataUpdatedAt > rejectedAt)) {
    return data.updateRequired;
  }
  return rejectedAt !== null;
}

function useIsAppReady() {
  const [fontsLoaded, fontError] = useAppFonts();
  const isRestoring = useIsRestoring();
  return (fontsLoaded || fontError !== null) && !isRestoring;
}

function RootStack() {
  const isReady = useIsAppReady();
  const isSignedIn = useIsSignedIn();
  const mustUpdate = useMustUpdate();

  useEffect(() => {
    if (isReady) SplashScreen.hide();
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!mustUpdate}>
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Screen name="+not-found" />
      </Stack.Protected>
      <Stack.Protected guard={mustUpdate}>
        <Stack.Screen name="update-required" options={{ gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayout() {
  return (
    <QueryProvider>
      <IntlProvider locale={locale} defaultLocale={locale} messages={messages}>
        <StatusBar style="dark" />
        <RootStack />
      </IntlProvider>
    </QueryProvider>
  );
}

export default withSentry(RootLayout);
