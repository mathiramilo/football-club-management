import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  PORT: z.coerce.number().int().positive().default(3001),
  SHUTDOWN_DRAIN_MS: z.coerce.number().int().min(0).default(0),
});

export type Env = z.infer<typeof envSchema>;
