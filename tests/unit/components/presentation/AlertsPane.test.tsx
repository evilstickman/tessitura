// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AlertsPane, type AlertsPaneProps } from '@/components/presentation/AlertsPane';

afterEach(() => cleanup());

function makeAlert(overrides: Partial<AlertsPaneProps['alerts'][number]> = {}) {
  return {
    id: 'alert-1',
    gridName: 'Bach Inventions',
    count: 3,
    type: 'decayed' as const,
    href: '/grids/g1',
    ...overrides,
  };
}

describe('AlertsPane', () => {
  it('renders the greeting with default fallback', () => {
    render(<AlertsPane alerts={[]} />);
    expect(screen.getByText('Welcome back, there')).toBeInTheDocument();
  });

  it('renders the greeting with a custom userName', () => {
    render(<AlertsPane alerts={[]} userName="Willow" />);
    expect(screen.getByText('Welcome back, Willow')).toBeInTheDocument();
  });

  it('renders the ALERTS header', () => {
    render(<AlertsPane alerts={[]} />);
    expect(screen.getByText('ALERTS')).toBeInTheDocument();
  });

  it('renders decayed alert with correct copy', () => {
    render(<AlertsPane alerts={[makeAlert()]} />);
    expect(screen.getByText('Resume Bach Inventions')).toBeInTheDocument();
    expect(screen.getByText('3 cells need re-practice')).toBeInTheDocument();
  });

  it('renders stale alert with correct copy', () => {
    render(
      <AlertsPane
        alerts={[makeAlert({ id: 's1', type: 'stale', gridName: 'Scales', count: 5 })]}
      />
    );
    expect(screen.getByText('Scales')).toBeInTheDocument();
    expect(screen.getByText('5 cells losing freshness')).toBeInTheDocument();
  });

  it('uses red left border for decayed alerts', () => {
    render(<AlertsPane alerts={[makeAlert()]} />);
    const link = screen.getByRole('link', { name: /Resume Bach Inventions/ });
    expect(link).toHaveStyle({ borderLeftColor: '#ef4444' });
  });

  it('uses amber left border for stale alerts', () => {
    render(
      <AlertsPane alerts={[makeAlert({ id: 's1', type: 'stale', gridName: 'Scales', count: 2 })]} />
    );
    const link = screen.getByRole('link', { name: /Scales/ });
    expect(link).toHaveStyle({ borderLeftColor: '#fbbf24' });
  });

  it('renders "See all" link when hasMore=true', () => {
    // The director is responsible for slicing; the pane renders whatever it receives
    // plus the hasMore flag to show the "See all" hint.
    const alerts = Array.from({ length: 5 }, (_, i) =>
      makeAlert({ id: `a${i}`, gridName: `Grid ${i}`, count: i + 1 })
    );
    render(<AlertsPane alerts={alerts} hasMore />);

    // 5 alert links + 1 "See all" link = 6 total links
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(6);
    expect(screen.getByText(/See all/)).toBeInTheDocument();
  });

  it('does not show "See all" when hasMore is absent or false', () => {
    const alerts = Array.from({ length: 5 }, (_, i) =>
      makeAlert({ id: `a${i}`, gridName: `Grid ${i}` })
    );
    render(<AlertsPane alerts={alerts} />);
    expect(screen.queryByText(/See all/)).not.toBeInTheDocument();
  });

  it('shows empty state when hasGrids is false', () => {
    render(<AlertsPane alerts={[]} hasGrids={false} />);
    expect(
      screen.getByText('Create your first practice grid to get started')
    ).toBeInTheDocument();
  });

  it('shows greeting only when hasGrids=true and no alerts', () => {
    render(<AlertsPane alerts={[]} hasGrids={true} />);
    expect(screen.getByText('Welcome back, there')).toBeInTheDocument();
    expect(
      screen.queryByText('Create your first practice grid to get started')
    ).not.toBeInTheDocument();
    // No alert items
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('alert links point to correct href', () => {
    render(<AlertsPane alerts={[makeAlert({ href: '/grids/abc' })]} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/grids/abc');
  });

  it('"See all" links to /grids', () => {
    const alerts = Array.from({ length: 5 }, (_, i) =>
      makeAlert({ id: `a${i}`, gridName: `Grid ${i}` })
    );
    render(<AlertsPane alerts={alerts} hasMore />);
    const seeAll = screen.getByText(/See all/);
    expect(seeAll.closest('a')).toHaveAttribute('href', '/grids');
  });
});
