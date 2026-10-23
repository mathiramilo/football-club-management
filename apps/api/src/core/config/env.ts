import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  PORT: z.coerce.number().int().positive().default(3001),
  SHUTDOWN_DRAIN_MS: z.coerce.number().int().min(0).default(0),
  MAILPIT_URL: z.url().default('http://localhost:8025'),
  EMAIL_FROM: z.email().default('no-reply@example.test'),
});

export type Env = z.infer<typeof envSchema>;
