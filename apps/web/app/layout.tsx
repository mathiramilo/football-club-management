import './globals.css';

import { colors } from '@repo/ui-tokens';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { Providers } from '@/components/providers';
import { locale } from '@/i18n/locale';
import { cn } from '@/lib/utils';

import { archivo, archivoExpanded, archivoSemiExpanded } from './fonts';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app');
  const name = t('name');

  return {
    title: { default: name, template: `%s · ${name}` },
    description: t('description'),
    applicationName: name,
  };
}

export const viewport: Viewport = {
  themeColor: colors.background,
  colorScheme: 'light',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang={locale}
      className={cn(archivo.variable, archivoSemiExpanded.variable, archivoExpanded.variable)}
    >
      <body>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
