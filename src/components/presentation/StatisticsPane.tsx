export interface StatisticsPaneProps {
  avgCompletion: number;
  cellsCompleted: number;
  hasGrids: boolean;
}

export function StatisticsPane({ avgCompletion, cellsCompleted, hasGrids }: StatisticsPaneProps) {
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
        STATISTICS
      </div>

      {!hasGrids ? (
        <div style={{ color: '#9ca3af', fontSize: '13px' }}>
          Complete your first cell to start tracking!
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '24px', color: '#10b981', fontWeight: 600 }}>
              {avgCompletion}%
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Avg completion</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', color: '#f9fafb', fontWeight: 600 }}>
              {cellsCompleted}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Cells completed</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', color: '#374151', fontWeight: 600 }}>
              {'\u2014'}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Streak (soon)</div>
          </div>
        </div>
      )}
    </div>
  );
}
