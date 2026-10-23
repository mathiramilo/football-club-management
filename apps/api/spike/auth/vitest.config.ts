import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: fileURLToPath(new URL('../..', import.meta.url)),
    include: ['spike/auth/**/*.spike.spec.ts'],
    globalSetup: './test/global-setup.ts',
    setupFiles: ['./test/support/setup-env.ts'],
  },
});
