import { defineConfig } from 'eslint/config';
import globals from 'globals';

import base from './base.js';

export default defineConfig([
  base,
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
]);
