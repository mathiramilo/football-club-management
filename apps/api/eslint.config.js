import node from '@repo/config/eslint/node';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['src/generated/**', 'dist-worker/**']),
  node,
  {
    rules: {
      // NestJS and nestjs-cls declare their options as classes (NestApplicationContextOptions,
      // ClsModuleOptions) but take plain objects, as their docs show.
      '@typescript-eslint/no-unsafe-class-instance-assignment': 'off',
    },
  },
]);
