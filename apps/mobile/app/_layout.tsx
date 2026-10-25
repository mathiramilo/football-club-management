import '@/global.css';

import { useIsRestoring } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { IntlProvider } from 'react-intl';

import { QueryProvider } from '@/components/query-provider';
import { setUpApiClient } from '@/lib/api-client';
import { useAppFonts } from '@/lib/fonts';
import { locale, messages } from '@/lib/i18n';
import { useIsSignedIn } from '@/lib/session';

void SplashScreen.preventAutoHideAsync();
setUpApiClient();

function useIsAppReady() {
  const [fontsLoaded, fontError] = useAppFonts();
  const isRestoring = useIsRestoring();
  return (fontsLoaded || fontError !== null) && !isRestoring;
}

function RootStack() {
  const isReady = useIsAppReady();
  const isSignedIn = useIsSignedIn();

  useEffect(() => {
    if (isReady) SplashScreen.hide();
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <IntlProvider locale={locale} defaultLocale={locale} messages={messages}>
        <StatusBar style="dark" />
        <RootStack />
      </IntlProvider>
    </QueryProvider>
  );
}
