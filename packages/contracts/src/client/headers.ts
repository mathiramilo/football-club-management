import { z } from 'zod';

export const APP_VERSION_HEADER = 'x-app-version';
export const PLATFORM_HEADER = 'x-platform';
export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
export const IDEMPOTENT_REPLAYED_HEADER = 'idempotent-replayed';

export const platform = z.enum(['ios', 'android', 'web']);
export const appVersion = z.string().regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
export const idempotencyKey = z.uuid();

export type Platform = z.infer<typeof platform>;
