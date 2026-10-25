import node from '@repo/config/eslint/node';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([globalIgnores(['src/generated/**', 'dist-worker/**']), node]);
