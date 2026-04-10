import Link from 'next/link';

interface Alert {
  id: string;
  gridName: string;
  count: number;
  type: 'decayed' | 'stale';
  href: string;
}

export interface AlertsPaneProps {
  alerts: Alert[];
  hasMore?: boolean;
  hasGrids?: boolean;
  userName?: string;
}

// The director (DashboardDirector.deriveAlerts) owns the business-rule limit
// and passes pre-sliced alerts + a `hasMore` flag to drive the "See all" link.
export function AlertsPane({ alerts, hasMore = false, hasGrids = true, userName }: AlertsPaneProps) {
  return (
    <div>
      <div
        style={{
          fontSize: '11px',
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px',
        }}
      >
        ALERTS
      </div>

      <div style={{ fontSize: '15px', color: '#f9fafb', fontWeight: 600, marginBottom: '12px' }}>
        Welcome back, {userName ?? 'there'}
      </div>

      {!hasGrids && (
        <div style={{ color: '#9ca3af', fontSize: '13px' }}>
          Create your first practice grid to get started
        </div>
      )}

      {hasGrids && alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              href={alert.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#111827',
                borderRadius: '4px',
                padding: '8px 10px',
                borderLeft: '3px solid',
                borderLeftColor: alert.type === 'decayed' ? '#ef4444' : '#fbbf24',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', color: '#f9fafb', fontWeight: 500 }}>
                  {alert.type === 'decayed'
                    ? `Resume ${alert.gridName}`
                    : alert.gridName}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                  {alert.type === 'decayed'
                    ? `${alert.count} cells need re-practice`
                    : `${alert.count} cells losing freshness`}
                </div>
              </div>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>{'\u2192'}</span>
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
