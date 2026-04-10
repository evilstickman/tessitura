import { GridRow } from '@/components/presentation/GridRow';
import type { FreshnessState } from '@/lib/freshness';

interface RowCellData {
  cellId: string;
  stepNumber: number;
  targetTempoBpm: number;
  freshnessState: FreshnessState;
  lastCompletionDate: string | null;
}

interface RowData {
  rowId: string;
  piece: { title: string; composer: string | null } | null;
  passageLabel: string | null;
  startMeasure: number;
  endMeasure: number;
  priority: string;
  cells: RowCellData[];
}

export interface GridTableProps {
  rows: RowData[];
  onComplete: (rowId: string, cellId: string) => void;
  onUndo: (rowId: string, cellId: string) => void;
}

export function GridTable({ rows, onComplete, onUndo }: GridTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table aria-label="Practice grid">
        <tbody>
          {rows.map((row) => (
            <GridRow
              key={row.rowId}
              rowId={row.rowId}
              piece={row.piece}
              passageLabel={row.passageLabel}
              startMeasure={row.startMeasure}
              endMeasure={row.endMeasure}
              priority={row.priority}
              cells={row.cells}
              onComplete={onComplete}
              onUndo={onUndo}
            />
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '8px' }}>
        Click to complete · Right-click or Delete key to undo
      </div>
    </div>
  );
}
