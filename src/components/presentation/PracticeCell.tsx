import type { FreshnessState } from '@/lib/freshness';

export interface PracticeCellProps {
  cellId: string;
  stepNumber: number;
  targetTempoBpm: number;
  freshnessState: FreshnessState;
  lastCompletionDate: string | null;
  onComplete: (cellId: string) => void;
  onUndo: (cellId: string) => void;
}

const FRESHNESS_COLORS: Record<FreshnessState, { backgroundColor: string; color: string }> = {
  incomplete: { backgroundColor: '#1f2937', color: '#9ca3af' },
  fresh: { backgroundColor: '#10b981', color: '#ffffff' },
  aging: { backgroundColor: '#6ee7b7', color: '#064e3b' },
  stale: { backgroundColor: '#a7f3d0', color: '#064e3b' },
  decayed: { backgroundColor: '#1f2937', color: '#9ca3af' },
};

function formatDate(isoDate: string): string {
  const parts = isoDate.split('-');
  const month = String(Number(parts[1]));
  const day = String(Number(parts[2]));
  return `${month}-${day}`;
}

function showsBpm(state: FreshnessState): boolean {
  return state === 'incomplete' || state === 'decayed';
}

export function PracticeCell({
  cellId,
  stepNumber,
  targetTempoBpm,
  freshnessState,
  lastCompletionDate,
  onComplete,
  onUndo,
}: PracticeCellProps) {
  const colors = FRESHNESS_COLORS[freshnessState];
  const displayText = showsBpm(freshnessState)
    ? String(targetTempoBpm)
    : formatDate(lastCompletionDate!);

  const ariaLabel = showsBpm(freshnessState)
    ? `Complete step ${stepNumber} at ${targetTempoBpm} BPM`
    : `Undo step ${stepNumber}, completed ${formatDate(lastCompletionDate!)}`;

  return (
    <td>
      <button
        type="button"
        style={{
          backgroundColor: colors.backgroundColor,
          color: colors.color,
          width: '100%',
          height: '100%',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
        }}
        aria-label={ariaLabel}
        onClick={() => onComplete(cellId)}
        onContextMenu={(e) => {
          e.preventDefault();
          onUndo(cellId);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            onUndo(cellId);
          }
        }}
      >
        {displayText}
      </button>
    </td>
  );
}
