'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GridHeader } from '@/components/presentation/GridHeader';
import { GridTable } from '@/components/presentation/GridTable';
import type { FreshnessState } from '@/models/freshness';

interface ApiCell {
  id: string;
  stepNumber: number;
  targetTempoBpm: number;
  freshnessState: FreshnessState;
  lastCompletionDate: string | null;
}

interface ApiRow {
  id: string;
  piece: { id: string; title: string; composer: string | null; part: string | null; studyReference: string | null } | null;
  passageLabel: string | null;
  startMeasure: number;
  endMeasure: number;
  targetTempo: number;
  priority: string;
  cells: ApiCell[];
}

interface ApiGridDetail {
  id: string;
  name: string;
  notes: string | null;
  fadeEnabled: boolean;
  completionPercentage: number;
  freshnessSummary: {
    fresh: number;
    aging: number;
    stale: number;
    decayed: number;
    incomplete: number;
  };
  rows: ApiRow[];
}

class AuthError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthError';
  }
}

class NotFoundError extends Error {
  constructor() {
    super('Grid not found');
    this.name = 'NotFoundError';
  }
}

async function fetchGrid(gridId: string): Promise<ApiGridDetail> {
  const response = await fetch(`/api/grids/${gridId}`);

  if (response.status === 401) {
    throw new AuthError();
  }

  if (response.status === 404) {
    throw new NotFoundError();
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch grid: ${response.status}`);
  }

  return response.json();
}

function mapRows(rows: ApiRow[]) {
  return rows.map((row) => ({
    rowId: row.id,
    piece: row.piece ? { title: row.piece.title, composer: row.piece.composer } : null,
    passageLabel: row.passageLabel,
    startMeasure: row.startMeasure,
    endMeasure: row.endMeasure,
    priority: row.priority,
    cells: row.cells.map((cell) => ({
      cellId: cell.id,
      stepNumber: cell.stepNumber,
      targetTempoBpm: cell.targetTempoBpm,
      freshnessState: cell.freshnessState,
      lastCompletionDate: cell.lastCompletionDate,
    })),
  }));
}

interface GridViewDirectorProps {
  gridId: string;
}

export function GridViewDirector({ gridId }: GridViewDirectorProps) {
  const queryClient = useQueryClient();
  const queryKey = ['grid', gridId];

  const { data: grid, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchGrid(gridId),
  });

  const completeMutation = useMutation({
    mutationFn: async ({ rowId, cellId }: { rowId: string; cellId: string }) => {
      const response = await fetch(
        `/api/grids/${gridId}/rows/${rowId}/cells/${cellId}/complete`,
        { method: 'POST' },
      );
      if (response.status === 409 || response.status === 404) {
        return; // silently ignore
      }
      if (!response.ok) {
        throw new Error(`Complete failed: ${response.status}`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const undoMutation = useMutation({
    mutationFn: async ({ rowId, cellId }: { rowId: string; cellId: string }) => {
      const response = await fetch(
        `/api/grids/${gridId}/rows/${rowId}/cells/${cellId}/undo`,
        { method: 'POST' },
      );
      if (response.status === 409 || response.status === 404) {
        return; // silently ignore
      }
      if (!response.ok) {
        throw new Error(`Undo failed: ${response.status}`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const fadeMutation = useMutation({
    mutationFn: async (fadeEnabled: boolean) => {
      const response = await fetch(`/api/grids/${gridId}/fade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fadeEnabled }),
      });
      if (!response.ok) {
        throw new Error(`Toggle fade failed: ${response.status}`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleComplete = (rowId: string, cellId: string) => {
    completeMutation.mutate({ rowId, cellId });
  };

  const handleUndo = (rowId: string, cellId: string) => {
    undoMutation.mutate({ rowId, cellId });
  };

  const handleToggleFade = () => {
    if (grid) {
      fadeMutation.mutate(!grid.fadeEnabled);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error instanceof AuthError) {
    return <div>Authentication required</div>;
  }

  if (error instanceof NotFoundError) {
    return <div>Grid not found</div>;
  }

  if (error) {
    return <div>Error loading grid</div>;
  }

  if (!grid) {
    return null;
  }

  return (
    <div>
      <GridHeader
        name={grid.name}
        notes={grid.notes}
        fadeEnabled={grid.fadeEnabled}
        completionPercentage={grid.completionPercentage}
        freshnessSummary={grid.freshnessSummary}
        onToggleFade={handleToggleFade}
      />
      <GridTable
        rows={mapRows(grid.rows)}
        onComplete={handleComplete}
        onUndo={handleUndo}
      />
    </div>
  );
}
