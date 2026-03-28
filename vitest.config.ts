import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
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
      '@engine': '/src/lib/assessment-engine',
      '@content': '/src/lib/content',
    },
  },
});
