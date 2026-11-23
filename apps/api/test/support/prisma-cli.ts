import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const prismaBin = createRequire(import.meta.url).resolve('prisma/build/index.js');

export interface PrismaCliResult {
  status: number | null;
  output: string;
}

const prismaEnv = (databaseUrl: string) => ({
  ...process.env,
  DATABASE_URL: databaseUrl,
  PRISMA_HIDE_UPDATE_MESSAGE: '1',
});

export function runPrisma(args: string[], databaseUrl: string): PrismaCliResult {
  const result = spawnSync(process.execPath, [prismaBin, ...args], {
    env: prismaEnv(databaseUrl),
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

export function runPrismaInBackground(
  args: string[],
  databaseUrl: string,
): Promise<PrismaCliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [prismaBin, ...args], { env: prismaEnv(databaseUrl) });
    let output = '';
    const collect = (chunk: Buffer) => {
      output += chunk.toString();
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', reject);
    child.on('close', (status) => {
      resolve({ status, output });
    });
  });
}
