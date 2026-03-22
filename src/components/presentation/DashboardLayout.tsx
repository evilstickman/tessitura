import React from 'react';

export interface DashboardLayoutProps {
  alerts: React.ReactNode;
  grids: React.ReactNode;
  stats: React.ReactNode;
  focus: React.ReactNode;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#1f2937',
  borderRadius: '6px',
  padding: '16px',
};

const GRID_CLASS = 'dashboard-grid';

export function DashboardLayout({ alerts, grids, stats, focus }: DashboardLayoutProps) {
  return (
    <>
      <style>{`@media (max-width: 768px) { .${GRID_CLASS} { grid-template-columns: 1fr !important; } }`}</style>
      <div
        className={GRID_CLASS}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          padding: '12px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div style={cardStyle}>{alerts}</div>
        <div style={cardStyle}>{grids}</div>
        <div style={cardStyle}>{stats}</div>
        <div style={cardStyle}>{focus}</div>
      </div>
    </>
  );
}
