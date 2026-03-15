import { describe, it, expect, afterEach } from 'vitest';
import { validateEnv } from '@/lib/env';

describe('validateEnv', () => {
  const originalEnv = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DATABASE_URL = originalEnv;
    }
  });

  it('returns env vars when all required vars are present', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    const result = validateEnv();
    expect(result.DATABASE_URL).toBe('postgresql://localhost:5432/test');
  });

  it('throws when required vars are missing', () => {
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      expect(() => validateEnv()).toThrow('Missing required environment variables');
    } finally {
      process.env.DATABASE_URL = saved;
    }
  });
});
