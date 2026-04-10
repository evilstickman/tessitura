// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DashboardLayout } from '@/components/presentation/DashboardLayout';

afterEach(() => cleanup());

describe('DashboardLayout', () => {
  it('renders all four children slots', () => {
    render(
      <DashboardLayout
        alerts={<div data-testid="alerts">Alerts</div>}
        grids={<div data-testid="grids">Grids</div>}
        stats={<div data-testid="stats">Stats</div>}
        focus={<div data-testid="focus">Focus</div>}
      />
    );

    expect(screen.getByTestId('alerts')).toBeInTheDocument();
    expect(screen.getByTestId('grids')).toBeInTheDocument();
    expect(screen.getByTestId('stats')).toBeInTheDocument();
    expect(screen.getByTestId('focus')).toBeInTheDocument();
  });

  it('applies the .dashboard-grid class for responsive layout via globals.css', () => {
    // Layout + responsive breakpoint live in src/app/globals.css under .dashboard-grid.
    // This test just asserts the class wiring; the CSS itself is static and not JS-testable.
    const { container } = render(
      <DashboardLayout
        alerts={<div>A</div>}
        grids={<div>G</div>}
        stats={<div>S</div>}
        focus={<div>F</div>}
      />
    );

    const grid = container.querySelector('.dashboard-grid') as HTMLElement;
    expect(grid).not.toBeNull();
    expect(grid.children).toHaveLength(4);
  });

  it('wraps each child in a card with correct styling', () => {
    render(
      <DashboardLayout
        alerts={<div data-testid="alerts">A</div>}
        grids={<div data-testid="grids">G</div>}
        stats={<div data-testid="stats">S</div>}
        focus={<div data-testid="focus">F</div>}
      />
    );

    const alertsCard = screen.getByTestId('alerts').parentElement!;
    expect(alertsCard).toHaveStyle({ backgroundColor: '#1f2937' });
    expect(alertsCard).toHaveStyle({ borderRadius: '6px' });
    expect(alertsCard).toHaveStyle({ padding: '16px' });
  });

});
