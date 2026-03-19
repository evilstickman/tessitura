// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useQueryClient } from '@tanstack/react-query';
import { QueryProvider } from '@/lib/query-client';

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
