import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

import { runPrisma } from './support/prisma-cli.js';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

let container: StartedPostgreSqlContainer | undefined;

export async function setup(project: TestProject): Promise<void> {
  container = await new PostgreSqlContainer('postgres:18.6-alpine').start();
  const databaseUrl = container.getConnectionUri();

  const migration = runPrisma(['migrate', 'deploy'], databaseUrl);
  if (migration.status !== 0) {
    await container.stop();
    throw new Error(`prisma migrate deploy failed:\n${migration.output}`);
  }

  project.provide('databaseUrl', databaseUrl);
}

export async function teardown(): Promise<void> {
  await container?.stop();
}
