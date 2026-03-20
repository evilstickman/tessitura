import Link from 'next/link';
import { GridCreateForm } from '@/components/presentation/GridCreateForm';

interface GridSummary {
  id: string;
  name: string;
  completionPercentage: number;
  updatedAt: string;
  attentionCount: number;
}

export interface MyGridsPaneProps {
  grids: GridSummary[];
  onNewGrid: () => void;
  showForm: boolean;
  onSubmitGrid: (name: string, notes: string) => void;
  onCancelForm: () => void;
  formError?: string | null;
}

const MAX_GRIDS = 5;

function formatDate(iso: string): string {
  const datePart = iso.split('T')[0];
  const [, month, day] = datePart.split('-');
  return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
}

export function MyGridsPane({
  grids,
  onNewGrid,
  showForm,
  onSubmitGrid,
  onCancelForm,
  formError,
}: MyGridsPaneProps) {
  const visibleGrids = grids.slice(0, MAX_GRIDS);
  const hasMore = grids.length > MAX_GRIDS;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          MY GRIDS
        </div>
        <button
          type="button"
          onClick={onNewGrid}
          style={{
            backgroundColor: 'transparent',
            color: '#10b981',
            border: 'none',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          + New Grid
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: '10px' }}>
          <GridCreateForm
            onSubmit={onSubmitGrid}
            onCancel={onCancelForm}
            error={formError}
          />
        </div>
      )}

      {grids.length === 0 && !showForm && (
        <div style={{ color: '#9ca3af', fontSize: '13px' }}>No practice grids yet.</div>
      )}

      {visibleGrids.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {visibleGrids.map((grid) => (
            <Link
              key={grid.id}
              href={`/grids/${grid.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#111827',
                borderRadius: '4px',
                padding: '8px 10px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: '#f9fafb', fontWeight: 500 }}>
                  {grid.name}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                  Updated {formatDate(grid.updatedAt)}
                </div>
                {grid.attentionCount > 0 && (
                  <div style={{ fontSize: '11px', color: '#fbbf24' }}>
                    {grid.attentionCount} cells need attention
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <div
                  style={{
                    width: '60px',
                    height: '4px',
                    backgroundColor: '#374151',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${grid.completionPercentage}%`,
                      height: '100%',
                      backgroundColor: '#10b981',
                      borderRadius: '2px',
                    }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#9ca3af', minWidth: '30px', textAlign: 'right' }}>
                  {grid.completionPercentage}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {hasMore && (
        <div style={{ marginTop: '8px' }}>
          <Link
            href="/grids"
            style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}
          >
            See all {'\u2192'}
          </Link>
        </div>
      )}
    </div>
  );
}
