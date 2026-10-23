import base from '@repo/config/eslint/base';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([globalIgnores(['src/generated/**']), base]);
