import Link from 'next/link';

type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Suggestion {
  rowId: string;
  label: string;
  gridName: string;
  priority: Priority;
  needsPracticeCount: number;
  href: string;
  allFresh: boolean;
}

export interface PracticeFocusPaneProps {
  suggestions: Suggestion[];
}

const MAX_SUGGESTIONS = 5;

const BADGE_CONFIG: Record<Priority, { bg: string; color: string; label: string }> = {
  CRITICAL: { bg: '#7f1d1d', color: '#fca5a5', label: 'CRIT' },
  HIGH: { bg: '#78350f', color: '#fbbf24', label: 'HIGH' },
  MEDIUM: { bg: '#374151', color: '#9ca3af', label: 'MED' },
  LOW: { bg: '#374151', color: '#9ca3af', label: 'LOW' },
};

export function PracticeFocusPane({ suggestions }: PracticeFocusPaneProps) {
  const visible = suggestions.slice(0, MAX_SUGGESTIONS);

  return (
    <div>
      <div
        style={{
          fontSize: '11px',
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '10px',
        }}
      >
        PRACTICE FOCUS
      </div>

      {suggestions.length === 0 ? (
        <div style={{ color: '#9ca3af', fontSize: '13px' }}>
          Start practicing to see personalized suggestions here
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {visible.map((s) => {
            const badge = BADGE_CONFIG[s.priority];
            return (
              <Link
                key={s.rowId}
                href={s.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#111827',
                  borderRadius: '4px',
                  padding: '8px 10px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <span
                  style={{
                    backgroundColor: badge.bg,
                    color: badge.color,
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    flexShrink: 0,
                  }}
                >
                  {badge.label}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#f9fafb', fontWeight: 500 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {s.allFresh
                      ? 'All fresh \u2014 keep it up!'
                      : `${s.gridName} \u00b7 ${s.needsPracticeCount} cells need practice`}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
