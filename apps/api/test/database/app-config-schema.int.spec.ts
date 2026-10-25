import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { expectViolation } from '../support/constraints.js';

describe('App config invariants (TECH-14)', () => {
  let db: PrismaService;

  beforeAll(() => {
    db = new PrismaService(inject('databaseUrl'));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('starts with one row per platform', async () => {
    const rows = await db.appConfig.findMany({ orderBy: { platform: 'asc' } });

    expect(rows.map(({ platform }) => platform)).toEqual(['android', 'ios', 'web']);
  });

  it('accepts only the known platforms', async () => {
    await expectViolation(
      db.appConfig.create({ data: { platform: 'windows' } }),
      'app_config_platform_check',
    );
  });

  it.each(['1.3', '1.3.0-beta.1', 'v1.3.0'])('rejects the minimum version %s', async (version) => {
    await expectViolation(
      db.appConfig.update({ where: { platform: 'android' }, data: { minimumVersion: version } }),
      'app_config_minimum_version_check',
    );
  });

  it('accepts only https store links', async () => {
    await expectViolation(
      db.appConfig.update({
        where: { platform: 'android' },
        data: { storeUrl: 'http://example.test/app' },
      }),
      'app_config_store_url_check',
    );
  });
});
