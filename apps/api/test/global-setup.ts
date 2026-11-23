import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import type { TestProject } from 'vitest/node';

import { runPrismaInBackground } from './support/prisma-cli.js';
import {
  prepareTestStorage,
  STORAGE_IMAGE,
  STORAGE_PORT,
  testStorageSettings,
} from './support/storage.js';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    storageEndpoint: string;
  }
}

let postgres: StartedPostgreSqlContainer | undefined;
let storage: StartedTestContainer | undefined;

const startStorage = () => {
  const { accessKeyId, secretAccessKey } = testStorageSettings('');
  return new GenericContainer(STORAGE_IMAGE)
    .withEnvironment({ AWS_ACCESS_KEY_ID: accessKeyId, AWS_SECRET_ACCESS_KEY: secretAccessKey })
    .withCommand(['server', '-s3', '-dir=/data', '-master.volumeSizeLimitMB=64'])
    .withExposedPorts(STORAGE_PORT)
    .start();
};

export async function setup(project: TestProject): Promise<void> {
  [postgres, storage] = await Promise.all([
    new PostgreSqlContainer('postgres:18.6-alpine').start(),
    startStorage(),
  ]);
  const databaseUrl = postgres.getConnectionUri();
  const storageEndpoint = `http://${storage.getHost()}:${String(storage.getMappedPort(STORAGE_PORT))}`;

  const [migration] = await Promise.all([
    runPrismaInBackground(['migrate', 'deploy'], databaseUrl),
    prepareTestStorage(testStorageSettings(storageEndpoint)),
  ]).catch(async (error: unknown) => {
    await teardown();
    throw error;
  });
  if (migration.status !== 0) {
    await teardown();
    throw new Error(`prisma migrate deploy failed:\n${migration.output}`);
  }

  project.provide('databaseUrl', databaseUrl);
  project.provide('storageEndpoint', storageEndpoint);
}

export async function teardown(): Promise<void> {
  await Promise.all([postgres?.stop(), storage?.stop()]);
}
