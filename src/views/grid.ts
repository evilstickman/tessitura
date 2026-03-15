interface GridRow {
  id: string;
  practiceGridId: string;
  sortOrder: number;
  songTitle: string | null;
  composer: string | null;
  part: string | null;
  passageLabel: string | null;
  startMeasure: number;
  endMeasure: number;
  targetTempo: number;
  steps: number;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  practiceCells: GridCell[];
}

interface GridCell {
  id: string;
  practiceRowId: string;
  stepNumber: number;
  targetTempoPercentage: number;
  freshnessIntervalDays: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  completions: GridCompletion[];
}

interface GridCompletion {
  id: string;
  practiceCellId: string;
  completionDate: Date;
  createdAt: Date;
  deletedAt: Date | null;
}

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
  practiceRows: GridRow[];
}

function formatCompletion(completion: GridCompletion) {
  return {
    id: completion.id,
    completionDate: completion.completionDate.toISOString(),
    createdAt: completion.createdAt.toISOString(),
  };
}

function formatCell(cell: GridCell, rowTargetTempo: number) {
  return {
    id: cell.id,
    stepNumber: cell.stepNumber,
    targetTempoPercentage: cell.targetTempoPercentage,
    targetTempoBpm: Math.round(cell.targetTempoPercentage * rowTargetTempo),
    freshnessIntervalDays: cell.freshnessIntervalDays,
    createdAt: cell.createdAt.toISOString(),
    updatedAt: cell.updatedAt.toISOString(),
    completions: cell.completions.map(formatCompletion),
  };
}

function formatRow(row: GridRow) {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    songTitle: row.songTitle,
    composer: row.composer,
    part: row.part,
    passageLabel: row.passageLabel,
    startMeasure: row.startMeasure,
    endMeasure: row.endMeasure,
    targetTempo: row.targetTempo,
    steps: row.steps,
    priority: row.priority,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    cells: row.practiceCells.map((cell) => formatCell(cell, row.targetTempo)),
  };
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
