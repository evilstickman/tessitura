'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GridHeader } from '@/components/presentation/GridHeader';
import { GridTable } from '@/components/presentation/GridTable';
import { AddRowToggle } from '@/components/presentation/AddRowToggle';
import type { FreshnessState } from '@/lib/freshness';
import { AuthError, NotFoundError } from '@/lib/api-errors';
import type { FreshnessSummary } from '@/lib/api-types';

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
  freshnessSummary: FreshnessSummary;
  rows: ApiRow[];
}

async function fetchGrid(gridId: string): Promise<ApiGridDetail> {
  const response = await fetch(`/api/grids/${gridId}`);

  if (response.status === 401) {
    throw new AuthError();
  }

  if (response.status === 404) {
    throw new NotFoundError('Grid not found');
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
  const [showRowForm, setShowRowForm] = useState(false);
  const [rowFormError, setRowFormError] = useState<string | null>(null);

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

  const createRowMutation = useMutation({
    mutationFn: async (data: { passageLabel: string; startMeasure: number; endMeasure: number; targetTempo: number; steps: number; priority: string }) => {
      const response = await fetch(`/api/grids/${gridId}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Failed to add row');
      }
      return response.json();
    },
    onSuccess: () => {
      // Keep form open so user can add multiple rows
      setRowFormError(null);
    },
    onError: (err: Error) => {
      setRowFormError(err.message);
    },
    onSettled: () => {
      // Refetch on both success and error — matches the "server is truth" pattern
      // used by completeMutation / undoMutation / fadeMutation.
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
    /* v8 ignore next -- grid is always defined when toggle button is rendered */
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

  /* v8 ignore next 3 -- TanStack Query v5 never returns undefined data on success; defensive guard */
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
      <AddRowToggle
        showForm={showRowForm}
        onShowForm={() => { setShowRowForm(true); setRowFormError(null); }}
        onCancelForm={() => { setShowRowForm(false); setRowFormError(null); }}
        onSubmitRow={(data) => createRowMutation.mutate(data)}
        error={rowFormError}
      />
      <GridTable
        rows={mapRows(grid.rows)}
        onComplete={handleComplete}
        onUndo={handleUndo}
      />
    </div>
  );
}
