import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules/', 'dist/'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/**/*.test.ts',
        'src/test-utils.ts',
        'src/index.ts',
        '**/*.config.ts',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 30000,
  },
});
