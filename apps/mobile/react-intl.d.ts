import type { MessageKey } from '@/lib/i18n';

declare global {
  namespace FormatjsIntl {
    interface Message {
      ids: MessageKey;
    }
  }
}
