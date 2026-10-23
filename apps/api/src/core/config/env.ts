import { z } from 'zod';

const commaSeparated = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

export const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  PORT: z.coerce.number().int().positive().default(3001),
  SHUTDOWN_DRAIN_MS: z.coerce.number().int().min(0).default(0),
  MAILPIT_URL: z.url().default('http://localhost:8025'),
  EMAIL_FROM: z.email().default('no-reply@example.test'),
  API_BASE_URL: z.url().default('http://localhost:3001'),
  BETTER_AUTH_SECRET: z.string().min(32),
  WEB_ORIGINS: commaSeparated.pipe(z.array(z.url())),
  GOOGLE_CLIENT_IDS: commaSeparated,
  APPLE_CLIENT_IDS: commaSeparated,
  AUTH_RATE_LIMIT_ENABLED: z.stringbool().default(true),
  AUTH_TRUSTED_PROXIES: commaSeparated,
});

export type Env = z.infer<typeof envSchema>;
