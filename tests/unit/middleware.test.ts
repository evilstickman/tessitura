import { describe, it, expect, vi } from 'vitest';

// Mock next-auth to avoid importing Next.js server modules
vi.mock('@/lib/auth.config', () => ({
  auth: vi.fn((handler: unknown) => handler),
}));

describe('middleware', () => {
  it('exports config with a single matcher pattern', async () => {
    const { config } = await import('@/middleware');
    expect(config.matcher).toHaveLength(1);
    expect(typeof config.matcher[0]).toBe('string');
  });

  it('matcher excludes api/auth, _next/static, _next/image, favicon.ico, and auth/ paths', async () => {
    const { config } = await import('@/middleware');
    const matcher = config.matcher[0];

    // Next.js negative-lookahead matcher pattern should contain these exclusions
    expect(matcher).toContain('api/auth');
    expect(matcher).toContain('_next/static');
    expect(matcher).toContain('_next/image');
    expect(matcher).toContain('favicon');
    expect(matcher).toContain('auth/');
  });

  it('exports a default handler function', async () => {
    const middleware = await import('@/middleware');
    expect(middleware.default).toBeDefined();
  });
});
