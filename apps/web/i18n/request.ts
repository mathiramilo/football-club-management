import messages from '@repo/i18n/messages/es.json';
import { getRequestConfig } from 'next-intl/server';

import { locale } from './locale';

export default getRequestConfig(() => ({ locale, messages }));
