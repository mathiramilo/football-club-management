import type { Breadcrumb, BrowserOptions, Event } from '@sentry/nextjs';

import { scrubUrl } from './scrub-url';

const FORWARDED_HEADERS = new Set(['user-agent']);
const URL_KEYS = ['url', 'from', 'to'];
const UNSENT_BREADCRUMBS = new Set(['console', 'ui.input']);

function scrubTransaction(name: string): string {
  const [method, path] = name.split(' ');
  return method && path ? `${method} ${scrubUrl(path)}` : scrubUrl(name);
}

function scrubData(data: Record<string, unknown> | undefined) {
  if (!data) return data;
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      URL_KEYS.includes(key) && typeof value === 'string' ? scrubUrl(value) : value,
    ]),
  );
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category && UNSENT_BREADCRUMBS.has(breadcrumb.category)) return null;
  return { ...breadcrumb, data: scrubData(breadcrumb.data) };
}

export function scrubEvent<T extends Event>(event: T): T {
  if (event.request) {
    const { method, url, headers = {} } = event.request;
    event.request = {
      method,
      url: url && scrubUrl(url),
      headers: Object.fromEntries(
        Object.entries(headers).filter(([name]) => FORWARDED_HEADERS.has(name.toLowerCase())),
      ),
    };
  }
  if (event.transaction) event.transaction = scrubTransaction(event.transaction);
  if (event.user) event.user = event.user.id === undefined ? undefined : { id: event.user.id };
  for (const exception of event.exception?.values ?? []) delete exception.value;
  event.breadcrumbs = event.breadcrumbs?.flatMap((breadcrumb) => scrubBreadcrumb(breadcrumb) ?? []);
  return event;
}

export function sentryOptions(): BrowserOptions {
  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'development',
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: [...FORWARDED_HEADERS] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    tracesSampleRate: 0,
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubEvent,
  };
}
