import { PracticeCell } from '@/components/presentation/PracticeCell';
import type { FreshnessState } from '@/models/freshness';

interface CellData {
  cellId: string;
  stepNumber: number;
  targetTempoBpm: number;
  freshnessState: FreshnessState;
  lastCompletionDate: string | null;
}

export interface GridRowProps {
  rowId: string;
  piece: { title: string; composer: string | null } | null;
  passageLabel: string | null;
  startMeasure: number;
  endMeasure: number;
  priority: string;
  cells: CellData[];
  onComplete: (rowId: string, cellId: string) => void;
  onUndo: (rowId: string, cellId: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#fbbf24',
  MEDIUM: '#9ca3af',
  LOW: '#9ca3af',
};

function getLabel(
  piece: { title: string } | null,
  passageLabel: string | null,
): string {
  if (piece && passageLabel) return `${piece.title} — ${passageLabel}`;
  if (piece) return piece.title;
  if (passageLabel) return passageLabel;
  return 'Untitled';
}

export function GridRow({
  rowId,
  piece,
  passageLabel,
  startMeasure,
  endMeasure,
  priority,
  cells,
  onComplete,
  onUndo,
}: GridRowProps) {
  const label = getLabel(piece, passageLabel);
  const priorityColor = PRIORITY_COLORS[priority] || '#9ca3af';

  return (
    <tr>
      <td style={{ whiteSpace: 'nowrap', padding: '4px 8px' }}>
        <div>{label}</div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          mm. {startMeasure}–{endMeasure} ·{' '}
          <span style={{ color: priorityColor }}>{priority}</span>
        </div>
      </td>
      {cells.map((cell) => (
        <PracticeCell
          key={cell.cellId}
          cellId={cell.cellId}
          stepNumber={cell.stepNumber}
          targetTempoBpm={cell.targetTempoBpm}
          freshnessState={cell.freshnessState}
          lastCompletionDate={cell.lastCompletionDate}
          onComplete={(cellId) => onComplete(rowId, cellId)}
          onUndo={(cellId) => onUndo(rowId, cellId)}
        />
      ))}
    </tr>
  );
}
