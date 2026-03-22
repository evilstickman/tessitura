// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GridViewDirector } from '@/components/directors/GridViewDirector';

afterEach(() => cleanup());

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const GRID_ID = 'grid-abc-123';

function makeGridResponse() {
  return {
    id: GRID_ID,
    name: 'Bach Partita Practice',
    notes: 'Focus on intonation',
    fadeEnabled: true,
    completionPercentage: 33.33,
    freshnessSummary: {
      fresh: 1,
      aging: 0,
      stale: 0,
      decayed: 0,
      incomplete: 2,
    },
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
    rows: [
      {
        id: 'row-1',
        sortOrder: 0,
        piece: { id: 'piece-1', title: 'Partita No. 2', composer: 'Bach', part: null, studyReference: null },
        passageLabel: 'Allemande',
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 72,
        steps: 3,
        priority: 'HIGH',
        completionPercentage: 33.33,
        freshnessSummary: { fresh: 1, aging: 0, stale: 0, decayed: 0, incomplete: 2 },
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-15T00:00:00.000Z',
        cells: [
          {
            id: 'cell-1',
            stepNumber: 1,
            targetTempoPercentage: 0.6,
            targetTempoBpm: 43,
            freshnessIntervalDays: 2,
            freshnessState: 'fresh',
            lastCompletionDate: '2026-03-18',
            isShielded: false,
            createdAt: '2026-03-15T00:00:00.000Z',
            updatedAt: '2026-03-15T00:00:00.000Z',
            completions: [{ id: 'comp-1', completionDate: '2026-03-18', createdAt: '2026-03-18T00:00:00.000Z' }],
          },
          {
            id: 'cell-2',
            stepNumber: 2,
            targetTempoPercentage: 0.8,
            targetTempoBpm: 58,
            freshnessIntervalDays: 1,
            freshnessState: 'incomplete',
            lastCompletionDate: null,
            isShielded: false,
            createdAt: '2026-03-15T00:00:00.000Z',
            updatedAt: '2026-03-15T00:00:00.000Z',
            completions: [],
          },
          {
            id: 'cell-3',
            stepNumber: 3,
            targetTempoPercentage: 1.0,
            targetTempoBpm: 72,
            freshnessIntervalDays: 1,
            freshnessState: 'incomplete',
            lastCompletionDate: null,
            isShielded: false,
            createdAt: '2026-03-15T00:00:00.000Z',
            updatedAt: '2026-03-15T00:00:00.000Z',
            completions: [],
          },
        ],
      },
      {
        // Row with piece: null — exercises the null branch in mapRows (line 78)
        id: 'row-2',
        sortOrder: 1,
        piece: null,
        passageLabel: 'Scale Exercise',
        startMeasure: 1,
        endMeasure: 4,
        targetTempo: 60,
        steps: 1,
        priority: 'LOW',
        completionPercentage: 0,
        freshnessSummary: { fresh: 0, aging: 0, stale: 0, decayed: 0, incomplete: 1 },
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-15T00:00:00.000Z',
        cells: [
          {
            id: 'cell-4',
            stepNumber: 1,
            targetTempoPercentage: 1.0,
            targetTempoBpm: 60,
            freshnessIntervalDays: 1,
            freshnessState: 'incomplete',
            lastCompletionDate: null,
            isShielded: false,
            createdAt: '2026-03-15T00:00:00.000Z',
            updatedAt: '2026-03-15T00:00:00.000Z',
            completions: [],
          },
        ],
      },
    ],
  };
}

describe('GridViewDirector', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows loading state initially', () => {
    fetchSpy.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders grid after fetch succeeds', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeGridResponse(),
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Bach Partita Practice')).toBeInTheDocument();
    });

    // Grid name in heading
    expect(screen.getByRole('heading', { name: 'Bach Partita Practice' })).toBeInTheDocument();

    // Fade toggle button present
    expect(screen.getByRole('switch')).toBeInTheDocument();

    // Verify fetch was called with correct URL
    expect(fetchSpy).toHaveBeenCalledWith(`/api/grids/${GRID_ID}`);
  });

  it('shows "Grid not found" for 404', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Grid not found')).toBeInTheDocument();
    });
  });

  it('shows "Authentication required" on 401', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Authentication required')).toBeInTheDocument();
    });
  });

  it('calls complete endpoint on cell click and triggers refetch', async () => {
    const user = userEvent.setup();
    const gridData = makeGridResponse();

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);

    // Wait for grid to load
    await waitFor(() => {
      expect(screen.getByText('Bach Partita Practice')).toBeInTheDocument();
    });

    // Click the incomplete cell (cell-2, shows BPM "58")
    const incompleteButton = screen.getByLabelText('Complete step 2 at 58 BPM');

    // Reset fetch mock to track the mutation call
    fetchSpy.mockClear();
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    await user.click(incompleteButton);

    await waitFor(() => {
      // Check that the complete endpoint was called
      const calls = fetchSpy.mock.calls;
      const completeCall = calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('/complete'),
      );
      expect(completeCall).toBeTruthy();
      expect(completeCall![0]).toBe(
        `/api/grids/${GRID_ID}/rows/row-1/cells/cell-2/complete`,
      );
      expect(completeCall![1]).toEqual(
        expect.objectContaining({ method: 'POST' }),
      );
    });

    // Check that refetch was triggered (grid endpoint called again)
    await waitFor(() => {
      const refetchCall = fetchSpy.mock.calls.find(
        (call: unknown[]) => call[0] === `/api/grids/${GRID_ID}`,
      );
      expect(refetchCall).toBeTruthy();
    });
  });

  it('calls undo endpoint on cell right-click', async () => {
    const gridData = makeGridResponse();

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Bach Partita Practice')).toBeInTheDocument();
    });

    // Right-click on cell-1 (fresh cell, shows date "3-18")
    const freshButton = screen.getByLabelText('Undo step 1, completed 3-18');

    fetchSpy.mockClear();
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    const { fireEvent } = await import('@testing-library/react');
    fireEvent.contextMenu(freshButton);

    await waitFor(() => {
      const undoCall = fetchSpy.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('/undo'),
      );
      expect(undoCall).toBeTruthy();
      expect(undoCall![0]).toBe(
        `/api/grids/${GRID_ID}/rows/row-1/cells/cell-1/undo`,
      );
      expect(undoCall![1]).toEqual(
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('calls fade toggle endpoint when fade switch is clicked', async () => {
    const user = userEvent.setup();
    const gridData = makeGridResponse();

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Bach Partita Practice')).toBeInTheDocument();
    });

    const fadeSwitch = screen.getByRole('switch');

    fetchSpy.mockClear();
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...gridData, fadeEnabled: false }),
    });

    await user.click(fadeSwitch);

    await waitFor(() => {
      const fadeCall = fetchSpy.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('/fade'),
      );
      expect(fadeCall).toBeTruthy();
      expect(fadeCall![0]).toBe(`/api/grids/${GRID_ID}/fade`);
      expect(fadeCall![1]).toEqual(
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ fadeEnabled: false }),
        }),
      );
    });
  });

  it('shows "Error loading grid" on generic fetch error', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Error loading grid')).toBeInTheDocument();
    });
  });


  it('throws error when undo mutation gets non-409/404 failure', async () => {
    const gridData = makeGridResponse();

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Bach Partita Practice')).toBeInTheDocument();
    });

    const freshButton = screen.getByLabelText('Undo step 1, completed 3-18');

    fetchSpy.mockClear();
    // Undo returns 500 — should throw (and onSettled still runs)
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });
    // Refetch after onSettled
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    const { fireEvent } = await import('@testing-library/react');
    fireEvent.contextMenu(freshButton);

    // onSettled still fires — grid should refetch
    await waitFor(() => {
      const refetchCall = fetchSpy.mock.calls.find(
        (call: unknown[]) => call[0] === `/api/grids/${GRID_ID}`,
      );
      expect(refetchCall).toBeTruthy();
    });
  });

  it('throws error when fade mutation gets a failure response', async () => {
    const user = userEvent.setup();
    const gridData = makeGridResponse();

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Bach Partita Practice')).toBeInTheDocument();
    });

    const fadeSwitch = screen.getByRole('switch');

    fetchSpy.mockClear();
    // Fade PUT returns 500
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });
    // Refetch after onSettled
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    await user.click(fadeSwitch);

    // onSettled still fires — grid should refetch
    await waitFor(() => {
      const refetchCall = fetchSpy.mock.calls.find(
        (call: unknown[]) => call[0] === `/api/grids/${GRID_ID}`,
      );
      expect(refetchCall).toBeTruthy();
    });
  });

  it('throws error when complete mutation gets non-409/404 failure', async () => {
    const user = userEvent.setup();
    const gridData = makeGridResponse();

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Bach Partita Practice')).toBeInTheDocument();
    });

    const incompleteButton = screen.getByLabelText('Complete step 2 at 58 BPM');

    fetchSpy.mockClear();
    // Complete returns 500 — should throw (and onSettled still fires)
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });
    // Refetch after onSettled
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    await user.click(incompleteButton);

    // onSettled still fires — grid should refetch
    await waitFor(() => {
      const refetchCall = fetchSpy.mock.calls.find(
        (call: unknown[]) => call[0] === `/api/grids/${GRID_ID}`,
      );
      expect(refetchCall).toBeTruthy();
    });
  });

  it('silently ignores 409 on undo mutation', async () => {
    const gridData = makeGridResponse();

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Bach Partita Practice')).toBeInTheDocument();
    });

    const freshButton = screen.getByLabelText('Undo step 1, completed 3-18');

    fetchSpy.mockClear();
    // Undo returns 409 — should silently ignore and still refetch
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'No completion to undo' }),
    });
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    const { fireEvent } = await import('@testing-library/react');
    fireEvent.contextMenu(freshButton);

    await waitFor(() => {
      const refetchCall = fetchSpy.mock.calls.find(
        (call: unknown[]) => call[0] === `/api/grids/${GRID_ID}`,
      );
      expect(refetchCall).toBeTruthy();
    });

    // Grid should still be visible (no error state)
    expect(screen.getByText('Bach Partita Practice')).toBeInTheDocument();
  });

  it('silently handles 409 on complete mutation', async () => {
    const user = userEvent.setup();
    const gridData = makeGridResponse();

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Bach Partita Practice')).toBeInTheDocument();
    });

    const incompleteButton = screen.getByLabelText('Complete step 2 at 58 BPM');

    fetchSpy.mockClear();
    // Complete returns 409
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Already completed' }),
    });
    // Refetch returns grid data
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridData,
    });

    await user.click(incompleteButton);

    // Should not show any error, and should refetch
    await waitFor(() => {
      const refetchCall = fetchSpy.mock.calls.find(
        (call: unknown[]) => call[0] === `/api/grids/${GRID_ID}`,
      );
      expect(refetchCall).toBeTruthy();
    });

    // Grid should still be visible (no error state)
    expect(screen.getByText('Bach Partita Practice')).toBeInTheDocument();
  });

  it('shows Add Row button and opens form on click', async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => makeGridResponse(),
    });

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);
    await waitFor(() => {
      expect(screen.getByText('+ Add Row')).toBeInTheDocument();
    });

    await user.click(screen.getByText('+ Add Row'));
    expect(screen.getByPlaceholderText('Start measure')).toBeInTheDocument();
  });

  it('creates row via form and refetches grid', async () => {
    const user = userEvent.setup();
    const gridResponse = makeGridResponse();
    fetchSpy
      .mockResolvedValueOnce({ ok: true, json: async () => gridResponse }) // initial fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-row' }) }) // POST create
      .mockResolvedValueOnce({ ok: true, json: async () => gridResponse }); // refetch

    renderWithQuery(<GridViewDirector gridId={GRID_ID} />);
    await waitFor(() => {
      expect(screen.getByText('+ Add Row')).toBeInTheDocument();
    });

    await user.click(screen.getByText('+ Add Row'));

    const { fireEvent } = await import('@testing-library/react');
    const startInput = screen.getByPlaceholderText('Start measure');
    await user.clear(startInput);
    await user.type(startInput, '1');
    await user.clear(screen.getByPlaceholderText('End measure'));
    await user.type(screen.getByPlaceholderText('End measure'), '8');
    await user.clear(screen.getByPlaceholderText('Target tempo (BPM)'));
    await user.type(screen.getByPlaceholderText('Target tempo (BPM)'), '120');
    await user.clear(screen.getByPlaceholderText('Steps (1-50)'));
    await user.type(screen.getByPlaceholderText('Steps (1-50)'), '5');

    fireEvent.submit(startInput.closest('form')!);

    await waitFor(() => {
      const postCall = fetchSpy.mock.calls.find(
        (c) => c[0] === `/api/grids/${GRID_ID}/rows` && c[1]?.method === 'POST',
      );
      expect(postCall).toBeTruthy();
    });
  });
});
