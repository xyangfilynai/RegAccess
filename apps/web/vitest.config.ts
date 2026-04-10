import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      reporter: ['text', 'html'],
      thresholds: {
        statements: 75,
        lines: 75,
        functions: 75,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, '../../packages/engine/src'),
      '@content': path.resolve(__dirname, 'src/lib/content'),
    },
  },
});
