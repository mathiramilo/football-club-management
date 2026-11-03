import type { Breadcrumb, Event, NodeOptions } from '@sentry/nestjs';

import type { SentryEnv } from '../config/env.js';

const FORWARDED_HEADERS = new Set(['user-agent', 'content-type', 'x-platform', 'x-app-version']);
const URL_ATTRIBUTES = new Set(['url', 'url.full', 'http.url', 'http.target']);
const QUERY_ATTRIBUTES = new Set(['url.query', 'http.query']);

const withoutQuery = (url: string) => url.split('?')[0] ?? '';

function scrubAttributes<T extends Record<string, unknown>>(data: T): T;
function scrubAttributes<T extends Record<string, unknown>>(data: T | undefined): T | undefined;
function scrubAttributes<T extends Record<string, unknown>>(data: T | undefined): T | undefined {
  if (!data) return data;
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => !QUERY_ATTRIBUTES.has(key))
      .map(([key, value]) => [
        key,
        URL_ATTRIBUTES.has(key) && typeof value === 'string' ? withoutQuery(value) : value,
      ]),
  ) as T;
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === 'console') return null;
  return { ...breadcrumb, data: scrubAttributes(breadcrumb.data) };
}

// Error messages can carry request data (Prisma prints the query arguments), so only types and frames are kept.
export function scrubEvent<T extends Event>(event: T): T {
  if (event.request) {
    const { method, url, headers = {} } = event.request;
    event.request = {
      method,
      url: url && withoutQuery(url),
      headers: Object.fromEntries(
        Object.entries(headers).filter(([name]) => FORWARDED_HEADERS.has(name.toLowerCase())),
      ),
    };
  }
  if (event.user) event.user = event.user.id === undefined ? undefined : { id: event.user.id };
  for (const exception of event.exception?.values ?? []) delete exception.value;
  event.breadcrumbs = event.breadcrumbs?.flatMap((breadcrumb) => scrubBreadcrumb(breadcrumb) ?? []);
  if (event.contexts?.trace) {
    event.contexts.trace = {
      ...event.contexts.trace,
      data: scrubAttributes(event.contexts.trace.data),
    };
  }
  return event;
}

export function sentryOptions(env: SentryEnv): NodeOptions {
  return {
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: [...FORWARDED_HEADERS] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    ignoreSpans: [/^GET \/health(\/ready)?$/],
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubEvent,
    beforeSendSpan: (span) => ({ ...span, attributes: scrubAttributes(span.attributes) }),
  };
}
