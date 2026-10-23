import { parseArgs } from 'node:util';

import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { z } from 'zod';

import { PrismaService } from '../src/core/database/prisma.service.js';
import { seedDatabase } from './seed/seed-database.js';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const { values } = parseArgs({
  options: {
    clubs: { type: 'string', default: '5' },
    months: { type: 'string', default: '12' },
    seed: { type: 'string', default: '1' },
    today: { type: 'string' },
    'allow-remote': { type: 'boolean', default: false },
  },
});

const options = z
  .object({
    clubs: z.coerce.number().int().min(1),
    months: z.coerce.number().int().min(1).max(36),
    seed: z.coerce.number().int(),
    today: z.iso.date(),
  })
  .parse({
    ...values,
    today: values.today ?? format(new TZDate(Date.now(), 'America/Montevideo'), 'yyyy-MM-dd'),
  });

const databaseUrl = z.url().parse(process.env.DATABASE_URL);
if (!LOCAL_HOSTS.has(new URL(databaseUrl).hostname) && !values['allow-remote']) {
  throw new Error(
    'Refusing to seed a database on another host. Pass --allow-remote for a preview database.',
  );
}

const db = new PrismaService(databaseUrl);
try {
  if ((await db.club.count()) > 0) {
    throw new Error(
      'The database already has clubs. Reset it first: pnpm --filter ./apps/api exec prisma migrate reset',
    );
  }
  process.stdout.write(
    `Seeding ${String(options.clubs)} clubs with ${String(options.months)} months of events up to ${options.today}\n`,
  );
  const { counts } = await seedDatabase(db, options, (clubIndex) => {
    process.stdout.write(`  club ${String(clubIndex + 1)}/${String(options.clubs)}\n`);
  });
  for (const [table, count] of Object.entries(counts)) {
    process.stdout.write(`${table.padEnd(20)} ${String(count)}\n`);
  }
} finally {
  await db.$disconnect();
}
