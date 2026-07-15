import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      'dist/**',
      'dist-electron/**',
      'mobile/**',
      'node_modules/**',
      'output/**',
      'release/**',
    ],
  },
});
