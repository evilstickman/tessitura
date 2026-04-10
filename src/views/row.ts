import { formatPieceInline } from '@/views/piece';
import {
  calculateFreshnessState,
  isShielded,
  effectiveFreshnessState,
  calculateCompletionPercentage,
  calculateFreshnessSummary,
  type CellWithState,
  type FreshnessState,
} from '@/lib/freshness';

interface RowPiece {
  id: string;
  userId: string;
  title: string;
  composer: string | null;
  part: string | null;
  studyReference: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface RowCell {
  id: string;
  practiceRowId: string;
  stepNumber: number;
  targetTempoPercentage: number;
  freshnessIntervalDays: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  completions: RowCompletion[];
}

interface RowCompletion {
  id: string;
  practiceCellId: string;
  completionDate: Date;
  createdAt: Date;
  deletedAt: Date | null;
}

interface RowRecord {
  id: string;
  practiceGridId: string;
  sortOrder: number;
  pieceId: string | null;
  piece: RowPiece | null;
  passageLabel: string | null;
  startMeasure: number;
  endMeasure: number;
  targetTempo: number;
  steps: number;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  practiceCells: RowCell[];
}

interface CellFreshnessData {
  freshnessState: FreshnessState;
  lastCompletionDate: string | null;
  isShielded: boolean;
}

interface CellWithSiblings extends RowCell {
  practiceRow: {
    targetTempo: number;
    practiceGrid: { fadeEnabled: boolean };
    practiceCells: (RowCell & { completions: RowCompletion[] })[];
  };
}

function formatCompletion(completion: RowCompletion) {
  return {
    id: completion.id,
    completionDate: completion.completionDate.toISOString().slice(0, 10),
    createdAt: completion.createdAt.toISOString(),
  };
}

function formatCell(cell: RowCell, rowTargetTempo: number, freshness: CellFreshnessData) {
  return {
    id: cell.id,
    stepNumber: cell.stepNumber,
    targetTempoPercentage: cell.targetTempoPercentage,
    targetTempoBpm: Math.round(cell.targetTempoPercentage * rowTargetTempo),
    freshnessIntervalDays: cell.freshnessIntervalDays,
    freshnessState: freshness.freshnessState,
    lastCompletionDate: freshness.lastCompletionDate,
    isShielded: freshness.isShielded,
    createdAt: cell.createdAt.toISOString(),
    updatedAt: cell.updatedAt.toISOString(),
    completions: cell.completions.map(formatCompletion),
  };
}

export function formatRow(row: RowRecord, fadeEnabled: boolean, now: Date) {

  // Sort cells by targetTempoPercentage ascending for shielding
  const sortedCells = [...row.practiceCells]
    .sort((a, b) => a.targetTempoPercentage - b.targetTempoPercentage);

  // Compute raw states for all cells
  const cellStates: CellWithState[] = sortedCells.map((cell) => {
    const lastCompletion = cell.completions.length > 0
      ? cell.completions[cell.completions.length - 1].completionDate
      : null;
    const rawState = calculateFreshnessState(lastCompletion, cell.freshnessIntervalDays, now);
    return {
      rawState,
      hasCompletions: cell.completions.length > 0,
    };
  });

  // Compute effective states (shielding + fade)
  const effectiveStates = cellStates.map((_, index) => {
    const shielded = isShielded(index, cellStates, fadeEnabled);
    return effectiveFreshnessState(cellStates[index].rawState, shielded, fadeEnabled);
  });

  // Format cells with freshness data
  const cells = sortedCells.map((cell, index) => {
    const lastCompletion = cell.completions.length > 0
      ? cell.completions[cell.completions.length - 1].completionDate
      : null;
    const shielded = isShielded(index, cellStates, fadeEnabled);
    const freshnessData: CellFreshnessData = {
      freshnessState: effectiveStates[index],
      lastCompletionDate: lastCompletion
        ? lastCompletion.toISOString().slice(0, 10)
        : null,
      isShielded: shielded,
    };
    return formatCell(cell, row.targetTempo, freshnessData);
  });

  // Row-level aggregates
  const cellEffective = effectiveStates.map((es) => ({ effectiveState: es }));

  return {
    id: row.id,
    sortOrder: row.sortOrder,
    piece: formatPieceInline(row.piece),
    passageLabel: row.passageLabel,
    startMeasure: row.startMeasure,
    endMeasure: row.endMeasure,
    targetTempo: row.targetTempo,
    steps: row.steps,
    priority: row.priority,
    completionPercentage: calculateCompletionPercentage(cellEffective, fadeEnabled),
    freshnessSummary: calculateFreshnessSummary(cellEffective),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    cells,
  };
}

/**
 * Format a single cell response for cell action endpoints (complete/undo/reset).
 * Must use ALL sibling cells to compute shielding correctly.
 */
export function formatCellResponse(cell: CellWithSiblings, now: Date) {
  const fadeEnabled = cell.practiceRow.practiceGrid.fadeEnabled;
  const targetTempo = cell.practiceRow.targetTempo;

  const siblings = [...cell.practiceRow.practiceCells]
    .sort((a, b) => a.targetTempoPercentage - b.targetTempoPercentage);

  const cellStates: CellWithState[] = siblings.map((sib) => {
    const lastCompletion = sib.completions.length > 0
      ? sib.completions[sib.completions.length - 1].completionDate
      : null;
    return {
      rawState: calculateFreshnessState(lastCompletion, sib.freshnessIntervalDays, now),
      hasCompletions: sib.completions.length > 0,
    };
  });

  const cellIndex = siblings.findIndex((sib) => sib.id === cell.id);
  const shielded = isShielded(cellIndex, cellStates, fadeEnabled);
  const effState = effectiveFreshnessState(cellStates[cellIndex].rawState, shielded, fadeEnabled);

  const lastCompletion = cell.completions.length > 0
    ? cell.completions[cell.completions.length - 1].completionDate
    : null;

  return {
    id: cell.id,
    stepNumber: cell.stepNumber,
    targetTempoPercentage: cell.targetTempoPercentage,
    targetTempoBpm: Math.round(cell.targetTempoPercentage * targetTempo),
    freshnessIntervalDays: cell.freshnessIntervalDays,
    freshnessState: effState,
    lastCompletionDate: lastCompletion ? lastCompletion.toISOString().slice(0, 10) : null,
    isShielded: shielded,
    createdAt: cell.createdAt.toISOString(),
    updatedAt: cell.updatedAt.toISOString(),
    completions: cell.completions.map(formatCompletion),
  };
}
