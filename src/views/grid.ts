import { formatRow } from '@/views/row';

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

export function formatGridDetail(grid: GridDetailRecord) {
  return {
    ...formatGrid(grid),
    rows: grid.practiceRows.map(formatRow),
  };
}

export function formatGridList(grids: GridRecord[]) {
  return grids.map(formatGrid);
}
