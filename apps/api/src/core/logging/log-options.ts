import type { IncomingMessage } from 'node:http';

import type { Request } from 'express';
import { ClsServiceManager } from 'nestjs-cls';
import { type LoggerOptions, stdTimeFunctions } from 'pino';
import type { Options as HttpLoggerOptions } from 'pino-http';

import type { Env } from '../config/env.js';
import type { RequestContext } from '../request-context.js';

const REDACTED_KEYS = [
  'authorization',
  'cookie',
  'password',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'otp',
  'email',
];
const UNLOGGED_PATHS = new Set(['/health', '/health/ready']);

const pathOf = (url = '') => url.split('?')[0] ?? '';

function contextFields() {
  const cls = ClsServiceManager.getClsService<RequestContext>();
  if (!cls.isActive()) return {};
  const job = cls.get('job');
  return {
    request_id: cls.getId(),
    user_id: cls.get('actor')?.userId,
    club_id: cls.get('clubActor')?.club.clubId,
    job_id: job?.id,
    queue: job?.queue,
  };
}

export function loggerOptions({
  LOG_LEVEL,
  LOG_FORMAT,
}: Pick<Env, 'LOG_LEVEL' | 'LOG_FORMAT'>): LoggerOptions {
  return {
    level: LOG_LEVEL,
    timestamp: stdTimeFunctions.isoTime,
    mixin: contextFields,
    redact: {
      paths: REDACTED_KEYS.flatMap((key) => [key, `*.${key}`]),
      censor: '[redacted]',
    },
    ...(LOG_FORMAT === 'json' && { formatters: { level: (label: string) => ({ level: label }) } }),
  };
}

// Query strings carry OAuth codes on Better Auth's callbacks, and headers carry the session, so neither is logged.
export function requestLoggingOptions(): HttpLoggerOptions {
  return {
    autoLogging: {
      ignore: (request: IncomingMessage) =>
        UNLOGGED_PATHS.has(pathOf((request as Request).originalUrl || request.url)),
    },
    customLogLevel: (_request, response, error) =>
      error || response.statusCode >= 500 ? 'error' : 'info',
    serializers: {
      req: (request: { method: string; url: string }) => ({
        method: request.method,
        path: pathOf(request.url),
      }),
      res: (response: { statusCode: number }) => ({ status: response.statusCode }),
    },
  };
}
