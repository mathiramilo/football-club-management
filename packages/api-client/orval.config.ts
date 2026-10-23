import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: { target: './openapi.json' },
    output: {
      mode: 'tags-split',
      target: './src/generated',
      schemas: './src/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      indexFiles: true,
      override: {
        mutator: { path: './src/api-fetch.ts', name: 'apiFetch' },
        fetch: { includeHttpResponseReturnType: false },
        query: { signal: true },
      },
    },
    hooks: { afterAllFilesWrite: 'prettier --write' },
  },
});
