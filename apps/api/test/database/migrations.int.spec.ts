import { describe, expect, inject, it } from 'vitest';

import { runPrisma } from '../support/prisma-cli.js';

describe('Prisma migrations (TECH-03)', () => {
  it('leave the database exactly as schema.prisma describes it', () => {
    const diff = runPrisma(
      [
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        'prisma/schema.prisma',
        '--exit-code',
      ],
      inject('databaseUrl'),
    );

    expect(diff.status, diff.output).toBe(0);
  });
});
