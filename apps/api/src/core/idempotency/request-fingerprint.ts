import { createHash } from 'node:crypto';

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, canonical(item)]),
  );
};

export function fingerprintRequest(method: string, url: string, body: unknown): string {
  return createHash('sha256')
    .update(`${method} ${url}\n${body === undefined ? '' : JSON.stringify(canonical(body))}`)
    .digest('base64url');
}
