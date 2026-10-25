import es from '@repo/i18n/messages/es.json';

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<typeof es>;

interface Catalog {
  [key: string]: string | Catalog;
}

const flatten = (catalog: Catalog, prefix = ''): Record<string, string> =>
  Object.fromEntries(
    Object.entries(catalog).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [[`${prefix}${key}`, value]]
        : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  );

export const locale = 'es';

export const messages = flatten(es);

type ErrorMessageCode = keyof typeof es.errors;

const hasErrorMessage = (code: string): code is ErrorMessageCode => code in es.errors;

export function errorMessageKey(...codes: (string | undefined)[]): MessageKey {
  const code = codes.find(
    (candidate): candidate is ErrorMessageCode =>
      candidate !== undefined && hasErrorMessage(candidate),
  );
  return code === undefined ? 'errors.INTERNAL_ERROR' : `errors.${code}`;
}
