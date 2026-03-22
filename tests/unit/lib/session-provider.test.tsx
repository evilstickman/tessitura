// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AuthSessionProvider } from '@/lib/session-provider';

afterEach(() => cleanup());

// SessionProvider fetches /api/auth/session on mount.
// In jsdom there's no server, so mock fetch to return an empty session.
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
  }) as unknown as typeof fetch;
});

describe('AuthSessionProvider', () => {
  it('renders children', () => {
    render(
      <AuthSessionProvider>
        <div data-testid="child">Hello</div>
      </AuthSessionProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
