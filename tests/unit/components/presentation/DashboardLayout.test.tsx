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

  it('uses CSS grid layout on the container', () => {
    const { container } = render(
      <DashboardLayout
        alerts={<div>A</div>}
        grids={<div>G</div>}
        stats={<div>S</div>}
        focus={<div>F</div>}
      />
    );

    // The first child is the <style> tag, the second is the grid container
    const grid = container.querySelector('.dashboard-grid') as HTMLElement;
    expect(grid).not.toBeNull();
    expect(grid.style.display).toBe('grid');
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    expect(grid.style.gap).toBe('12px');
    expect(grid.style.padding).toBe('12px');
    expect(grid.style.maxWidth).toBe('1200px');
    expect(grid.style.margin).toBe('0px auto');
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

  it('includes responsive style tag for single column at <768px', () => {
    const { container } = render(
      <DashboardLayout
        alerts={<div>A</div>}
        grids={<div>G</div>}
        stats={<div>S</div>}
        focus={<div>F</div>}
      />
    );

    const styleTag = container.querySelector('style');
    expect(styleTag).not.toBeNull();
    expect(styleTag!.textContent).toContain('768px');
    expect(styleTag!.textContent).toContain('1fr');
  });
});
