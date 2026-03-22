'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/presentation/DashboardLayout';
import { AlertsPane } from '@/components/presentation/AlertsPane';
import { MyGridsPane } from '@/components/presentation/MyGridsPane';
import { StatisticsPane } from '@/components/presentation/StatisticsPane';
import { PracticeFocusPane } from '@/components/presentation/PracticeFocusPane';

// --- API types ---

interface FreshnessSummary {
  fresh: number;
  aging: number;
  stale: number;
  decayed: number;
  incomplete: number;
}

interface ApiRowSummary {
  id: string;
  piece: { id: string; title: string; composer: string | null; part: string | null; studyReference: string | null } | null;
  passageLabel: string | null;
  startMeasure: number;
  endMeasure: number;
  priority: string;
  completionPercentage: number;
  freshnessSummary: FreshnessSummary;
}

interface ApiGridSummary {
  id: string;
  name: string;
  notes: string | null;
  fadeEnabled: boolean;
  completionPercentage: number;
  freshnessSummary: FreshnessSummary;
  createdAt: string;
  updatedAt: string;
  rows: ApiRowSummary[];
}

// --- Error classes ---

class AuthError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthError';
  }
}

// --- Fetch ---

async function fetchGrids(): Promise<ApiGridSummary[]> {
  const response = await fetch('/api/grids?detail=true');

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch grids: ${response.status}`);
  }

  return response.json();
}

// --- Helpers ---

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function getRowLabel(
  piece: { title: string } | null,
  passageLabel: string | null,
): string {
  if (piece && passageLabel) return `${piece.title} — ${passageLabel}`;
  if (piece) return piece.title;
  if (passageLabel) return passageLabel;
  return 'Untitled';
}

// --- Derivation functions ---

function deriveAlerts(grids: ApiGridSummary[]) {
  const decayedAlerts: { id: string; gridName: string; count: number; type: 'decayed'; href: string }[] = [];
  const staleAlerts: { id: string; gridName: string; count: number; type: 'stale'; href: string }[] = [];

  for (const grid of grids) {
    if (grid.freshnessSummary.decayed > 0) {
      decayedAlerts.push({
        id: `${grid.id}-decayed`,
        gridName: grid.name,
        count: grid.freshnessSummary.decayed,
        type: 'decayed',
        href: `/grids/${grid.id}`,
      });
    }
    if (grid.freshnessSummary.stale > 0) {
      staleAlerts.push({
        id: `${grid.id}-stale`,
        gridName: grid.name,
        count: grid.freshnessSummary.stale,
        type: 'stale',
        href: `/grids/${grid.id}`,
      });
    }
  }

  // Sort within each group by count descending
  decayedAlerts.sort((a, b) => b.count - a.count);
  staleAlerts.sort((a, b) => b.count - a.count);

  return [...decayedAlerts, ...staleAlerts];
}

function deriveStats(grids: ApiGridSummary[]) {
  if (grids.length === 0) {
    return { avgCompletion: 0, cellsCompleted: 0 };
  }

  const avgCompletion = Math.round(
    grids.reduce((sum, g) => sum + g.completionPercentage, 0) / grids.length,
  );

  const cellsCompleted = grids.reduce((sum, g) => {
    const fs = g.freshnessSummary;
    return sum + fs.fresh + fs.aging + fs.stale + fs.decayed;
  }, 0);

  return { avgCompletion, cellsCompleted };
}

function derivePracticeFocus(grids: ApiGridSummary[]) {
  interface RowWithGrid {
    row: ApiRowSummary;
    gridName: string;
    gridId: string;
  }

  const allRows: RowWithGrid[] = grids.flatMap((g) =>
    g.rows.map((row) => ({ row, gridName: g.name, gridId: g.id })),
  );

  // Rows that need practice (stale + decayed > 0)
  const needsPractice = allRows.filter(
    ({ row }) => row.freshnessSummary.stale + row.freshnessSummary.decayed > 0,
  );

  if (needsPractice.length > 0) {
    // Sort by priority first, then stale+decayed count descending
    needsPractice.sort((a, b) => {
      // ?? 4 fallback: unknown priority values sort last — defensive only
      /* c8 ignore next */
      const priA = PRIORITY_ORDER[a.row.priority] ?? 4;
      /* c8 ignore next */
      const priB = PRIORITY_ORDER[b.row.priority] ?? 4;
      if (priA !== priB) return priA - priB;
      const countA = a.row.freshnessSummary.stale + a.row.freshnessSummary.decayed;
      const countB = b.row.freshnessSummary.stale + b.row.freshnessSummary.decayed;
      return countB - countA;
    });

    return needsPractice.slice(0, 5).map(({ row, gridName, gridId }) => ({
      rowId: row.id,
      label: getRowLabel(row.piece, row.passageLabel),
      gridName,
      priority: row.priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
      needsPracticeCount: row.freshnessSummary.stale + row.freshnessSummary.decayed,
      href: `/grids/${gridId}`,
      allFresh: false,
    }));
  }

  // No rows need practice — show top 5 by priority with allFresh=true
  const sorted = [...allRows].sort((a, b) => {
    // ?? 4 fallback: unknown priority values sort last — defensive only
    /* c8 ignore next */
    const priA = PRIORITY_ORDER[a.row.priority] ?? 4;
    /* c8 ignore next */
    const priB = PRIORITY_ORDER[b.row.priority] ?? 4;
    return priA - priB;
  });

  return sorted.slice(0, 5).map(({ row, gridName, gridId }) => ({
    rowId: row.id,
    label: getRowLabel(row.piece, row.passageLabel),
    gridName,
    priority: row.priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    needsPracticeCount: 0,
    href: `/grids/${gridId}`,
    allFresh: true,
  }));
}

function deriveGridCards(grids: ApiGridSummary[]) {
  return grids.map((g) => ({
    id: g.id,
    name: g.name,
    completionPercentage: g.completionPercentage,
    updatedAt: g.updatedAt,
    attentionCount: g.freshnessSummary.stale + g.freshnessSummary.decayed,
  }));
}

// --- Component ---

export function DashboardDirector() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? undefined;


  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: grids, isLoading, error } = useQuery({
    queryKey: ['grids', 'detail'],
    queryFn: fetchGrids,
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, notes }: { name: string; notes: string }) => {
      const response = await fetch('/api/grids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, notes: notes || undefined }),
      });

      if (!response.ok) {
        throw new Error('Failed to create grid');
      }

      return response.json();
    },
    onSuccess: () => {
      setShowCreateForm(false);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['grids'] });
    },
    onError: () => {
      setFormError('Failed to create grid.');
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: '#f9fafb' }}>
        Loading...
      </div>
    );
  }

  if (error instanceof AuthError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: '#f9fafb' }}>
        Authentication required
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: '#f9fafb' }}>
        Failed to load dashboard.
      </div>
    );
  }

  /* v8 ignore next 3 -- TanStack Query v5 never returns undefined data on success; defensive guard */
  if (!grids) {
    return null;
  }

  const alerts = deriveAlerts(grids);
  const stats = deriveStats(grids);
  const suggestions = derivePracticeFocus(grids);
  const gridCards = deriveGridCards(grids);
  const hasGrids = grids.length > 0;

  return (
    <DashboardLayout
      alerts={<AlertsPane alerts={alerts} hasGrids={hasGrids} userName={userName} />}
      grids={
        <MyGridsPane
          grids={gridCards}
          onNewGrid={() => {
            setShowCreateForm(true);
            setFormError(null);
          }}
          showForm={showCreateForm}
          onSubmitGrid={(name, notes) => createMutation.mutate({ name, notes })}
          onCancelForm={() => {
            setShowCreateForm(false);
            setFormError(null);
          }}
          formError={formError}
        />
      }
      stats={
        <StatisticsPane
          avgCompletion={stats.avgCompletion}
          cellsCompleted={stats.cellsCompleted}
          hasGrids={hasGrids}
        />
      }
      focus={<PracticeFocusPane suggestions={suggestions} />}
    />
  );
}
