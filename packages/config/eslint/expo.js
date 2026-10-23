import { defineConfig, globalIgnores } from 'eslint/config';
import expo from 'eslint-config-expo/flat.js';

import base from './base.js';

export default defineConfig([globalIgnores(['.expo/**', 'expo-env.d.ts']), expo, base]);
