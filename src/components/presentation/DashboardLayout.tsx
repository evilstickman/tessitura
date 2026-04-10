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

// Grid layout + responsive breakpoint live in `src/app/globals.css`
// under the `.dashboard-grid` class.
export function DashboardLayout({ alerts, grids, stats, focus }: DashboardLayoutProps) {
  return (
    <div className="dashboard-grid">
      <div style={cardStyle}>{alerts}</div>
      <div style={cardStyle}>{grids}</div>
      <div style={cardStyle}>{stats}</div>
      <div style={cardStyle}>{focus}</div>
    </div>
  );
}
