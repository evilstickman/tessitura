// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AuthSessionProvider } from '@/lib/session-provider';

afterEach(() => cleanup());

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
