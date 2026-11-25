// Public routes that carry an access-granting token in the path, which must never reach logs or Sentry.
const TOKEN_PATHS = [/(\/v1\/public\/invites\/)[^/?#\s]+/g];

export const redactTokenPaths = (text: string): string =>
  TOKEN_PATHS.reduce((redacted, pattern) => redacted.replace(pattern, '$1[redacted]'), text);

export const scrubPath = (url = ''): string => redactTokenPaths(url.split('?')[0] ?? '');
