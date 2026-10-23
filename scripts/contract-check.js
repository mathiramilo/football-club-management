import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DOCUMENT = 'packages/api-client/openapi.json';
// oasdiff ships no npm package, so it runs from its image, pinned like every other tool.
const OASDIFF =
  'tufin/oasdiff:v1.34.1@sha256:67a23cfea7d251e2ae34ee703ac8733c5d96bc2e7b90fd0f4d475ec99367b85f';
const baseRef = process.env.CONTRACT_BASE_REF ?? 'origin/main';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const mergeBase = git('merge-base', baseRef, 'HEAD');
let baseDocument;
try {
  baseDocument = git('show', `${mergeBase}:${DOCUMENT}`);
} catch {
  console.log(`${baseRef} has no ${DOCUMENT} yet, so there is nothing to compare against.`);
  process.exit(0);
}

const workdir = mkdtempSync(join(tmpdir(), 'contract-check-'));
try {
  writeFileSync(join(workdir, 'base.json'), baseDocument);
  copyFileSync(DOCUMENT, join(workdir, 'head.json'));
  const { status } = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '--volume',
      `${workdir}:/specs:ro`,
      OASDIFF,
      'breaking',
      '/specs/base.json',
      '/specs/head.json',
      '--fail-on',
      'ERR',
    ],
    { stdio: 'inherit' },
  );
  process.exitCode = status ?? 1;
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
