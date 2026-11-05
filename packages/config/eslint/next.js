import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

import base, { withOurTypescriptPlugin } from './base.js';

export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts']),
  withOurTypescriptPlugin(nextVitals),
  base,
]);
