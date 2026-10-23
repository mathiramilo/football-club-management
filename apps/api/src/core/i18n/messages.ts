import es from '@repo/i18n/messages/es.json' with { type: 'json' };
import { IntlMessageFormat } from 'intl-messageformat';

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<typeof es>;

export type MessageValues = Record<string, string | number>;

export function formatMessage(key: MessageKey, values?: MessageValues): string {
  const pattern = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        typeof node === 'object' && node !== null
          ? (node as Record<string, unknown>)[part]
          : undefined,
      es,
    );
  if (typeof pattern !== 'string') throw new Error(`Missing message: ${key}`);

  const message = new IntlMessageFormat(pattern, 'es').format(values);
  if (typeof message !== 'string') throw new Error(`Message ${key} did not format to plain text`);
  return message;
}
