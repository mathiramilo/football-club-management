import type messages from '@repo/i18n/messages/es.json';

import type { locale } from '@/i18n/locale';

declare module 'next-intl' {
  interface AppConfig {
    Locale: typeof locale;
    Messages: typeof messages;
  }
}
