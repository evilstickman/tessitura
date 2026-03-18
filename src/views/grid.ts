import { formatRow } from '@/views/row';
import {
  calculateCompletionPercentage,
  calculateFreshnessSummary,
  type CellWithEffectiveState,
} from '@/models/freshness';

interface GridRecord {
  id: string;
  userId: string;
  name: string;
  notes: string | null;
  fadeEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface GridDetailRecord extends GridRecord {
  practiceRows: Parameters<typeof formatRow>[0][];
}

export function formatGrid(grid: GridRecord) {
  return {
    id: grid.id,
    name: grid.name,
    notes: grid.notes,
    fadeEnabled: grid.fadeEnabled,
    createdAt: grid.createdAt.toISOString(),
    updatedAt: grid.updatedAt.toISOString(),
  };
}

export function formatGridDetail(grid: GridDetailRecord, now: Date) {
  const rows = grid.practiceRows.map((row) => formatRow(row, grid.fadeEnabled, now));

  const allCellStates: CellWithEffectiveState[] = rows.flatMap((row) =>
    row.cells.map((cell) => ({ effectiveState: cell.freshnessState }))
  );

  return {
    ...formatGrid(grid),
    completionPercentage: calculateCompletionPercentage(allCellStates, grid.fadeEnabled),
    freshnessSummary: calculateFreshnessSummary(allCellStates),
    rows,
  };
}

export function formatGridList(grids: GridRecord[]) {
  return grids.map(formatGrid);
}
