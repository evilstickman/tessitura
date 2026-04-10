'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthError, NotFoundError } from '@/lib/api-errors';

const MAX_RETRIES = 2;

/**
 * Retry filter: never retry on client-side errors (auth failures, not found).
 * 4xx responses are deterministic — retrying produces the same error, wastes
 * requests, and delays the UI showing the real error state.
 *
 * Exported for testing — not imported by consumers.
 */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof AuthError || error instanceof NotFoundError) return false;
  return failureCount < MAX_RETRIES;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            retry: shouldRetry,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
