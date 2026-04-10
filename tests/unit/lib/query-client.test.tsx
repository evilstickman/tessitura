// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useQueryClient } from '@tanstack/react-query';
import { QueryProvider, shouldRetry } from '@/lib/query-client';
import { AuthError, NotFoundError } from '@/lib/api-errors';

function TestChild() {
  const client = useQueryClient();
  return <div data-testid="child">{client ? 'has-client' : 'no-client'}</div>;
}

describe('QueryProvider', () => {
  it('provides a QueryClient to children', () => {
    render(
      <QueryProvider>
        <TestChild />
      </QueryProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('has-client');
  });
});

describe('shouldRetry', () => {
  it('never retries on AuthError', () => {
    expect(shouldRetry(0, new AuthError())).toBe(false);
    expect(shouldRetry(1, new AuthError())).toBe(false);
  });

  it('never retries on NotFoundError', () => {
    expect(shouldRetry(0, new NotFoundError())).toBe(false);
    expect(shouldRetry(5, new NotFoundError())).toBe(false);
  });

  it('retries up to 2 times on other errors', () => {
    const err = new Error('network glitch');
    expect(shouldRetry(0, err)).toBe(true);
    expect(shouldRetry(1, err)).toBe(true);
    expect(shouldRetry(2, err)).toBe(false);
    expect(shouldRetry(3, err)).toBe(false);
  });
});
