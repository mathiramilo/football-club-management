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

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

export const sentryEnvSchema = z.object({
  SENTRY_DSN: optional(z.url()),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
});

export type SentryEnv = z.infer<typeof sentryEnvSchema>;

export const envSchema = z
  .object({
    ...sentryEnvSchema.shape,
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    PORT: z.coerce.number().int().positive().default(3001),
    SHUTDOWN_DRAIN_MS: z.coerce.number().int().min(0).default(0),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
    MAILPIT_URL: z.url().default('http://localhost:8025'),
    EMAIL_FROM: z.email().default('no-reply@example.test'),
    API_BASE_URL: z.url().default('http://localhost:3001'),
    BETTER_AUTH_SECRET: z.string().min(32),
    WEB_ORIGINS: commaSeparated.pipe(z.array(z.url().transform((url) => new URL(url).origin))),
    AUTH_COOKIE_DOMAIN: optional(z.hostname()),
    GOOGLE_CLIENT_IDS: commaSeparated,
    GOOGLE_CLIENT_SECRET: optional(z.string()),
    APPLE_CLIENT_IDS: commaSeparated,
    APPLE_TEAM_ID: optional(z.string()),
    APPLE_KEY_ID: optional(z.string()),
    APPLE_PRIVATE_KEY: optional(z.string().transform((pem) => pem.replaceAll('\\n', '\n'))),
    AUTH_RATE_LIMIT_ENABLED: z.stringbool().default(true),
    AUTH_TRUSTED_PROXIES: commaSeparated,
    POSTHOG_API_KEY: optional(z.string()),
    POSTHOG_HOST: z.url().default('https://eu.i.posthog.com'),
  })
  .refine(
    (env) =>
      new Set([env.APPLE_TEAM_ID, env.APPLE_KEY_ID, env.APPLE_PRIVATE_KEY].map(Boolean)).size === 1,
    {
      message: 'Set APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY together',
      path: ['APPLE_PRIVATE_KEY'],
    },
  );

export type Env = z.infer<typeof envSchema>;
