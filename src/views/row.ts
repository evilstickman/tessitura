import { formatPieceInline } from '@/views/piece';

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

function formatCompletion(completion: RowCompletion) {
  return {
    id: completion.id,
    completionDate: completion.completionDate.toISOString(),
    createdAt: completion.createdAt.toISOString(),
  };
}

function formatCell(cell: RowCell, rowTargetTempo: number) {
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

export function formatRow(row: RowRecord) {
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    cells: row.practiceCells.map((cell) => formatCell(cell, row.targetTempo)),
  };
}
