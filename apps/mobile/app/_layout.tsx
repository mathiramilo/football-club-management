import '@/global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { IntlProvider } from 'react-intl';

import { useAppFonts } from '@/lib/fonts';
import { locale, messages } from '@/lib/i18n';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const isReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (isReady) SplashScreen.hide();
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <IntlProvider locale={locale} defaultLocale={locale} messages={messages}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </IntlProvider>
  );
}
