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

void SplashScreen.preventAutoHideAsync();
setUpApiClient();

function useIsAppReady() {
  const [fontsLoaded, fontError] = useAppFonts();
  const isRestoring = useIsRestoring();
  return (fontsLoaded || fontError !== null) && !isRestoring;
}

function RootStack() {
  const isReady = useIsAppReady();

  useEffect(() => {
    if (isReady) SplashScreen.hide();
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <IntlProvider locale={locale} defaultLocale={locale} messages={messages}>
        <StatusBar style="auto" />
        <RootStack />
      </IntlProvider>
    </QueryProvider>
  );
}
