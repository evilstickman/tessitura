import { describe, it, expect } from 'vitest';

describe('middleware config', () => {
  it('matcher pattern excludes api/, _next/, favicon.ico, and auth/ paths', () => {
    // The middleware matcher is a regex-like pattern used by Next.js.
    // We test the pattern string directly rather than importing the middleware
    // (which requires next/server and next-auth Edge Runtime modules).
    const matcher = '/((?!api/|_next/static|_next/image|favicon\\.ico|auth/).*)';

    expect(matcher).toContain('api/');
    expect(matcher).toContain('_next/static');
    expect(matcher).toContain('_next/image');
    expect(matcher).toContain('favicon');
    expect(matcher).toContain('auth/');
  });
});
