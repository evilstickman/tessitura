import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/tessitura_test',
    },
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
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
        // Framework scaffolding — zero logic, pure JSX. Will gain tests when
        // real UI work begins (M2+). Justified in CLAUDE.md § Coverage Exclusions.
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/globals.css',
        // Empty directories (only .gitkeep) — no code to cover yet.
        'src/components/**',
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
