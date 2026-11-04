import { z } from 'zod';

export const platform = z.enum(['ios', 'android', 'web']);
export const appVersion = z.string().regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
export const idempotencyKey = z.uuid();

export type Platform = z.infer<typeof platform>;
