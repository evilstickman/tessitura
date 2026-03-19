// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GridListDirector } from '@/components/directors/GridListDirector';

afterEach(() => cleanup());

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('GridListDirector', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state initially', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    render(<GridListDirector />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders grid list after fetch succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: 'g1', name: 'Grid One' },
        { id: 'g2', name: 'Grid Two' },
      ]),
    }) as unknown as typeof fetch;

    render(<GridListDirector />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Grid One')).toBeInTheDocument();
      expect(screen.getByText('Grid Two')).toBeInTheDocument();
    });
  });

  it('shows empty state when no grids', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }) as unknown as typeof fetch;

    render(<GridListDirector />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No practice grids yet.')).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch;

    render(<GridListDirector />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Failed to load grids.')).toBeInTheDocument();
    });
  });

  it('shows "Authentication required" on 401 instead of redirecting', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as unknown as typeof fetch;

    render(<GridListDirector />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Authentication required')).toBeInTheDocument();
    });
  });
});
