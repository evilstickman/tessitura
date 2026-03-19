import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/tessitura_test',
    },
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
    environmentMatchGlobs: [
      ['tests/unit/components/**', 'jsdom'],
      ['tests/integration/components/**', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        // CSS file, not executable code.
        'src/app/globals.css',
        // Prisma auto-generated client — not our code, regenerated on every build.
        'src/generated/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
