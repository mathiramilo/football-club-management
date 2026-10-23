import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    globalSetup: './test/global-setup.ts',
    setupFiles: ['./test/support/setup-env.ts'],
  },
});
