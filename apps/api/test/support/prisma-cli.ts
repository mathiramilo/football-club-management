import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const prismaBin = createRequire(import.meta.url).resolve('prisma/build/index.js');

export interface PrismaCliResult {
  status: number | null;
  output: string;
}

export function runPrisma(args: string[], databaseUrl: string): PrismaCliResult {
  const result = spawnSync(process.execPath, [prismaBin, ...args], {
    env: { ...process.env, DATABASE_URL: databaseUrl, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}
