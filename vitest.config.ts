import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
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
        // CSS file, not executable code.
        'src/app/globals.css',
        // Prisma auto-generated client — not our code, regenerated on every build.
        'src/generated/**',
        // Auth.js v5 config — pure wiring, no custom logic. Tested via integration tests
        // that mock auth() and verify getCurrentUserId behavior.
        'src/lib/auth.config.ts',
        // Auth.js edge-safe config — providers + callbacks only, used by middleware.
        'src/lib/auth.edge.ts',
        // Auth.js route handler — re-exports handlers from auth.config, zero custom code.
        'src/app/api/auth/**',
        // Next.js middleware — Auth.js wiring, tested via E2E redirect tests.
        'src/middleware.ts',
        // Next.js page/layout wrappers — thin components that render directors/providers.
        // Zero logic, tested via E2E. Individual directors/components have full unit test coverage.
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/grids/page.tsx',
        'src/app/grids/[id]/page.tsx',
        'src/app/auth/signin/page.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
