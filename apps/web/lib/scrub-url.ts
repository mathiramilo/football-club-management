const TOKEN_PATH = /^\/(e|j|c|consent)\/[^/]+/;
const ORIGIN = /^[a-z][a-z\d+.-]*:\/\/[^/]+/i;

export function scrubUrl(url: string): string {
  const [withoutQuery = ''] = url.split(/[?#]/);
  const origin = ORIGIN.exec(withoutQuery)?.[0] ?? '';
  return origin + withoutQuery.slice(origin.length).replace(TOKEN_PATH, '/$1/:token');
}
