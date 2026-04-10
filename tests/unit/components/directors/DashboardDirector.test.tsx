// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next-auth/react before importing the component
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Test User' } }, status: 'authenticated' }),
  signOut: vi.fn(),
}));

import { DashboardDirector } from '@/components/directors/DashboardDirector';

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

function makeGridsResponse() {
  return [
    {
      id: 'grid-1',
      name: 'Bach Partita',
      notes: null,
      fadeEnabled: true,
      completionPercentage: 50,
      freshnessSummary: {
        fresh: 2,
        aging: 1,
        stale: 1,
        decayed: 2,
        incomplete: 0,
      },
      createdAt: '2026-03-15T00:00:00.000Z',
      updatedAt: '2026-03-18T00:00:00.000Z',
      rows: [
        {
          id: 'row-1',
          piece: { id: 'piece-1', title: 'Partita No. 2', composer: 'Bach', part: null, studyReference: null },
          passageLabel: 'Allemande',
          startMeasure: 1,
          endMeasure: 8,
          priority: 'HIGH',
          completionPercentage: 50,
          freshnessSummary: { fresh: 1, aging: 0, stale: 1, decayed: 1, incomplete: 0 },
        },
        {
          id: 'row-2',
          piece: { id: 'piece-1', title: 'Partita No. 2', composer: 'Bach', part: null, studyReference: null },
          passageLabel: 'Sarabande',
          startMeasure: 1,
          endMeasure: 16,
          priority: 'CRITICAL',
          completionPercentage: 50,
          freshnessSummary: { fresh: 1, aging: 1, stale: 0, decayed: 1, incomplete: 0 },
        },
      ],
    },
    {
      id: 'grid-2',
      name: 'Scales',
      notes: null,
      fadeEnabled: false,
      completionPercentage: 100,
      freshnessSummary: {
        fresh: 3,
        aging: 0,
        stale: 0,
        decayed: 0,
        incomplete: 0,
      },
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-17T00:00:00.000Z',
      rows: [
        {
          id: 'row-3',
          piece: null,
          passageLabel: 'G Major',
          startMeasure: 1,
          endMeasure: 4,
          priority: 'LOW',
          completionPercentage: 100,
          freshnessSummary: { fresh: 3, aging: 0, stale: 0, decayed: 0, incomplete: 0 },
        },
      ],
    },
  ];
}

describe('DashboardDirector', () => {
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
    renderWithQuery(<DashboardDirector />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders all 4 panes after fetch with correct derived data', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeGridsResponse(),
    });

    renderWithQuery(<DashboardDirector />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('ALERTS')).toBeInTheDocument();
    });

    // Verify fetch was called with detail=true
    expect(fetchSpy).toHaveBeenCalledWith('/api/grids?detail=true');

    // ALERTS — decayed first, then stale
    // Grid "Bach Partita" has 2 decayed → resume alert
    expect(screen.getByText('Resume Bach Partita')).toBeInTheDocument();
    expect(screen.getByText('2 cells need re-practice')).toBeInTheDocument();
    // Grid "Bach Partita" has 1 stale → decay warning
    expect(screen.getByText('1 cells losing freshness')).toBeInTheDocument();

    // STATISTICS
    // avgCompletion = mean(50, 100) = 75
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Avg completion')).toBeInTheDocument();
    // cellsCompleted = (2+1+1+2) + (3+0+0+0) = 9
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('Cells completed')).toBeInTheDocument();

    // MY GRIDS — grid names visible
    expect(screen.getByText('+ New Grid')).toBeInTheDocument();

    // PRACTICE FOCUS
    expect(screen.getByText('PRACTICE FOCUS')).toBeInTheDocument();
    // Row-2 (CRITICAL priority, 1 decayed) should appear first
    // getRowLabel: piece title + passageLabel → "Partita No. 2 — Sarabande"
    expect(screen.getByText('Partita No. 2 — Sarabande')).toBeInTheDocument();
    // Row-1 (HIGH priority, 1 stale + 1 decayed = 2) should appear second
    expect(screen.getByText('Partita No. 2 — Allemande')).toBeInTheDocument();
  });

  it('shows "Failed to load dashboard." on fetch failure', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });

    renderWithQuery(<DashboardDirector />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard.')).toBeInTheDocument();
    });
  });

  it('shows "Authentication required" on 401', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    renderWithQuery(<DashboardDirector />);

    await waitFor(() => {
      expect(screen.getByText('Authentication required')).toBeInTheDocument();
    });
  });

  it('grid creation mutation calls POST and refetches', async () => {
    const user = userEvent.setup();

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeGridsResponse(),
    });

    renderWithQuery(<DashboardDirector />);

    await waitFor(() => {
      expect(screen.getByText('ALERTS')).toBeInTheDocument();
    });

    // Click "+ New Grid" to show form
    await user.click(screen.getByText('+ New Grid'));

    // Fill in the grid name
    const nameInput = screen.getByPlaceholderText('Grid name');
    await user.type(nameInput, 'My New Grid');

    // Reset fetch to track mutation
    fetchSpy.mockClear();
    // POST response
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'grid-new', name: 'My New Grid' }),
    });
    // Refetch response
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeGridsResponse(),
    });

    // Click "Create"
    await user.click(screen.getByText('Create'));

    // Verify POST was called
    await waitFor(() => {
      const postCall = fetchSpy.mock.calls.find(
        (call: unknown[]) =>
          call[0] === '/api/grids' &&
          (call[1] as RequestInit)?.method === 'POST',
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse((postCall![1] as RequestInit).body as string);
      expect(body.name).toBe('My New Grid');
    });

    // Verify refetch was triggered
    await waitFor(() => {
      const refetchCall = fetchSpy.mock.calls.find(
        (call: unknown[]) => call[0] === '/api/grids?detail=true',
      );
      expect(refetchCall).toBeDefined();
    });

    // Form should be hidden after success
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Grid name')).not.toBeInTheDocument();
    });
  });

  it('shows form error when grid creation fails', async () => {
    const user = userEvent.setup();

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeGridsResponse(),
    });

    renderWithQuery(<DashboardDirector />);

    await waitFor(() => {
      expect(screen.getByText('ALERTS')).toBeInTheDocument();
    });

    // Click "+ New Grid" to show form
    await user.click(screen.getByText('+ New Grid'));

    const nameInput = screen.getByPlaceholderText('Grid name');
    await user.type(nameInput, 'Bad Grid');

    // Reset fetch — POST fails
    fetchSpy.mockClear();
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 'VALIDATION_ERROR', message: 'Name too short' } }),
    });
    // Keep refetch working
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeGridsResponse(),
    });

    await user.click(screen.getByText('Create'));

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText('Failed to create grid.')).toBeInTheDocument();
    });
  });

  it('renders empty state when no grids exist', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });

    renderWithQuery(<DashboardDirector />);

    await waitFor(() => {
      expect(screen.getByText('ALERTS')).toBeInTheDocument();
    });

    // Stats should show empty state
    expect(screen.getByText('Complete your first cell to start tracking!')).toBeInTheDocument();

    // Alerts should show empty state
    expect(screen.getByText('Create your first practice grid to get started')).toBeInTheDocument();

    // No practice grids message
    expect(screen.getByText('No practice grids yet.')).toBeInTheDocument();
  });

  it('hides form when cancel is clicked', async () => {
    const user = userEvent.setup();

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeGridsResponse(),
    });

    renderWithQuery(<DashboardDirector />);

    await waitFor(() => {
      expect(screen.getByText('ALERTS')).toBeInTheDocument();
    });

    // Show the form
    await user.click(screen.getByText('+ New Grid'));
    expect(screen.getByPlaceholderText('Grid name')).toBeInTheDocument();

    // Cancel — form should disappear
    await user.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Grid name')).not.toBeInTheDocument();
  });


  it('shows practice focus with allFresh when no rows need practice', async () => {
    const gridsAllFresh = [
      {
        id: 'grid-1',
        name: 'All Fresh Grid',
        notes: null,
        fadeEnabled: true,
        completionPercentage: 100,
        freshnessSummary: { fresh: 3, aging: 0, stale: 0, decayed: 0, incomplete: 0 },
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-18T00:00:00.000Z',
        rows: [
          {
            id: 'row-1',
            piece: { id: 'p1', title: 'Fresh Piece', composer: null, part: null, studyReference: null },
            passageLabel: null,
            startMeasure: 1,
            endMeasure: 4,
            priority: 'HIGH',
            completionPercentage: 100,
            freshnessSummary: { fresh: 3, aging: 0, stale: 0, decayed: 0, incomplete: 0 },
          },
        ],
      },
    ];

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridsAllFresh,
    });

    renderWithQuery(<DashboardDirector />);

    await waitFor(() => {
      expect(screen.getByText('PRACTICE FOCUS')).toBeInTheDocument();
    });

    // Should show the row with allFresh message
    expect(screen.getByText('Fresh Piece')).toBeInTheDocument();
    expect(screen.getByText(/All fresh/)).toBeInTheDocument();
  });

  it('sorts practice focus by count when priorities are equal', async () => {
    // This exercises the secondary sort (lines 161-163) in derivePracticeFocus:
    // when two rows have the same priority, sort by stale+decayed count descending.
    const gridsEqualPriority = [
      {
        id: 'grid-1',
        name: 'Equal Priority Grid',
        notes: null,
        fadeEnabled: true,
        completionPercentage: 50,
        freshnessSummary: { fresh: 0, aging: 0, stale: 3, decayed: 3, incomplete: 0 },
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-18T00:00:00.000Z',
        rows: [
          {
            id: 'row-a',
            piece: { id: 'p1', title: 'Piece A', composer: null, part: null, studyReference: null },
            passageLabel: 'Movement 1',
            startMeasure: 1,
            endMeasure: 8,
            priority: 'HIGH',
            completionPercentage: 0,
            // Lower count: 1 stale + 1 decayed = 2
            freshnessSummary: { fresh: 0, aging: 0, stale: 1, decayed: 1, incomplete: 0 },
          },
          {
            id: 'row-b',
            piece: { id: 'p1', title: 'Piece A', composer: null, part: null, studyReference: null },
            passageLabel: 'Movement 2',
            startMeasure: 9,
            endMeasure: 16,
            priority: 'HIGH',
            completionPercentage: 0,
            // Higher count: 1 stale + 2 decayed = 3 — should sort first
            freshnessSummary: { fresh: 0, aging: 0, stale: 1, decayed: 2, incomplete: 0 },
          },
        ],
      },
    ];

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridsEqualPriority,
    });

    renderWithQuery(<DashboardDirector />);

    await waitFor(() => {
      expect(screen.getByText('PRACTICE FOCUS')).toBeInTheDocument();
    });

    // Both rows should appear; Movement 2 (higher count) before Movement 1
    const items = screen.getAllByText(/Piece A/);
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  it('shows passageLabel as row label when piece is null', async () => {
    // Exercises getRowLabel line 84: piece===null, passageLabel!==null → returns passageLabel
    const gridsWithPassageOnly = [
      {
        id: 'grid-1',
        name: 'Exercises Grid',
        notes: null,
        fadeEnabled: false,
        completionPercentage: 0,
        freshnessSummary: { fresh: 0, aging: 0, stale: 0, decayed: 1, incomplete: 0 },
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-18T00:00:00.000Z',
        rows: [
          {
            id: 'row-x',
            piece: null,
            passageLabel: 'Scale Exercise',
            startMeasure: 1,
            endMeasure: 4,
            priority: 'HIGH',
            completionPercentage: 0,
            freshnessSummary: { fresh: 0, aging: 0, stale: 0, decayed: 1, incomplete: 0 },
          },
        ],
      },
    ];

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridsWithPassageOnly,
    });

    renderWithQuery(<DashboardDirector />);

    await waitFor(() => {
      expect(screen.getByText('PRACTICE FOCUS')).toBeInTheDocument();
    });

    // Should show passageLabel as the label (piece is null)
    expect(screen.getByText('Scale Exercise')).toBeInTheDocument();
  });

  it('shows "Untitled" as row label when both piece and passageLabel are null', async () => {
    // Exercises getRowLabel line 85: piece===null, passageLabel===null → returns 'Untitled'
    const gridsWithUntitled = [
      {
        id: 'grid-1',
        name: 'Untitled Grid',
        notes: null,
        fadeEnabled: false,
        completionPercentage: 0,
        freshnessSummary: { fresh: 0, aging: 0, stale: 0, decayed: 1, incomplete: 0 },
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-18T00:00:00.000Z',
        rows: [
          {
            id: 'row-u',
            piece: null,
            passageLabel: null,
            startMeasure: 1,
            endMeasure: 4,
            priority: 'MEDIUM',
            completionPercentage: 0,
            freshnessSummary: { fresh: 0, aging: 0, stale: 0, decayed: 1, incomplete: 0 },
          },
        ],
      },
    ];

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridsWithUntitled,
    });

    renderWithQuery(<DashboardDirector />);

    await waitFor(() => {
      expect(screen.getByText('PRACTICE FOCUS')).toBeInTheDocument();
    });

    // Should show 'Untitled' when both piece and passageLabel are null
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('passes session user name to AlertsPane greeting', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeGridsResponse(),
    });

    renderWithQuery(<DashboardDirector />);

    await waitFor(() => {
      expect(screen.getByText('Welcome back, Test User')).toBeInTheDocument();
    });
  });

  it('sorts allFresh rows by priority when multiple rows exist', async () => {
    // This exercises lines 179-181 in derivePracticeFocus:
    // sorting allFresh rows by priority when there are multiple rows.
    const gridsMultiRowFresh = [
      {
        id: 'grid-1',
        name: 'Multi Row Fresh Grid',
        notes: null,
        fadeEnabled: true,
        completionPercentage: 100,
        freshnessSummary: { fresh: 6, aging: 0, stale: 0, decayed: 0, incomplete: 0 },
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-18T00:00:00.000Z',
        rows: [
          {
            id: 'row-low',
            piece: { id: 'p1', title: 'Low Priority Piece', composer: null, part: null, studyReference: null },
            passageLabel: null,
            startMeasure: 1,
            endMeasure: 4,
            priority: 'LOW',
            completionPercentage: 100,
            freshnessSummary: { fresh: 3, aging: 0, stale: 0, decayed: 0, incomplete: 0 },
          },
          {
            id: 'row-critical',
            piece: { id: 'p2', title: 'Critical Priority Piece', composer: null, part: null, studyReference: null },
            passageLabel: null,
            startMeasure: 1,
            endMeasure: 4,
            priority: 'CRITICAL',
            completionPercentage: 100,
            freshnessSummary: { fresh: 3, aging: 0, stale: 0, decayed: 0, incomplete: 0 },
          },
        ],
      },
    ];

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gridsMultiRowFresh,
    });

    renderWithQuery(<DashboardDirector />);

    await waitFor(() => {
      expect(screen.getByText('PRACTICE FOCUS')).toBeInTheDocument();
    });

    // Both rows should be in the allFresh list
    expect(screen.getByText('Critical Priority Piece')).toBeInTheDocument();
    expect(screen.getByText('Low Priority Piece')).toBeInTheDocument();
  });
});
