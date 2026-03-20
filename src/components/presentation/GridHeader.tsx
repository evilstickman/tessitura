'use client';

import { useState } from 'react';

interface FreshnessSummary {
  fresh: number;
  aging: number;
  stale: number;
  decayed: number;
  incomplete: number;
}

export interface GridHeaderProps {
  name: string;
  notes: string | null;
  fadeEnabled: boolean;
  completionPercentage: number;
  freshnessSummary: FreshnessSummary;
  onToggleFade: () => void;
}

const FRESHNESS_DISPLAY: {
  key: keyof FreshnessSummary;
  label: string;
  color: string;
  border?: string;
}[] = [
  { key: 'fresh', label: 'fresh', color: '#10b981' },
  { key: 'aging', label: 'aging', color: '#6ee7b7' },
  { key: 'stale', label: 'stale', color: '#a7f3d0' },
  { key: 'decayed', label: 'decayed', color: '#374151', border: '1px solid #6b7280' },
  { key: 'incomplete', label: 'incomplete', color: '#374151', border: '1px solid #6b7280' },
];

export function GridHeader({
  name,
  notes,
  fadeEnabled,
  completionPercentage,
  freshnessSummary,
  onToggleFade,
}: GridHeaderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const roundedPct = Math.round(completionPercentage);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 style={{ margin: 0 }}>{name}</h1>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand header' : 'Collapse header'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            color: '#9ca3af',
          }}
        >
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      {/* Progress bar — always visible */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        <div
          style={{
            flex: 1,
            height: '8px',
            backgroundColor: '#374151',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            data-testid="progress-fill"
            style={{
              width: `${roundedPct}%`,
              height: '100%',
              backgroundColor: '#10b981',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ fontSize: '0.875rem', color: '#d1d5db' }}>{roundedPct}%</span>
      </div>

      {/* Fade toggle — always visible */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        <span style={{ fontSize: '0.875rem', color: '#d1d5db' }}>Fade</span>
        <button
          type="button"
          role="switch"
          aria-checked={fadeEnabled}
          aria-label="Toggle fade"
          onClick={onToggleFade}
          style={{
            width: '36px',
            height: '20px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: fadeEnabled ? '#10b981' : '#374151',
            position: 'relative',
            padding: 0,
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              position: 'absolute',
              top: '2px',
              left: fadeEnabled ? '18px' : '2px',
              transition: 'left 0.2s ease',
            }}
          />
        </button>
      </div>

      {/* Collapsible content */}
      {!collapsed && (
        <>
          {notes && (
            <p style={{ color: '#d1d5db', marginTop: '8px', fontSize: '0.875rem' }}>
              {notes}
            </p>
          )}

          {/* Freshness summary */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
            {FRESHNESS_DISPLAY.filter(({ key }) => freshnessSummary[key] > 0).map(
              ({ key, label, color, border }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div
                    data-testid={`freshness-square-${key}`}
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: color,
                      border: border || 'none',
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#d1d5db' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {freshnessSummary[key]}
                  </span>
                </div>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
