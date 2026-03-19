// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StatisticsPane } from '@/components/presentation/StatisticsPane';

afterEach(() => cleanup());

describe('StatisticsPane', () => {
  it('renders the STATISTICS header', () => {
    render(<StatisticsPane avgCompletion={42} cellsCompleted={18} hasGrids={true} />);
    expect(screen.getByText('STATISTICS')).toBeInTheDocument();
  });

  it('renders avg completion percentage', () => {
    render(<StatisticsPane avgCompletion={42} cellsCompleted={18} hasGrids={true} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('Avg completion')).toBeInTheDocument();
  });

  it('renders cells completed count', () => {
    render(<StatisticsPane avgCompletion={42} cellsCompleted={18} hasGrids={true} />);
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Cells completed')).toBeInTheDocument();
  });

  it('renders streak placeholder as dimmed dash', () => {
    render(<StatisticsPane avgCompletion={42} cellsCompleted={18} hasGrids={true} />);
    const dash = screen.getByText('\u2014');
    expect(dash).toBeInTheDocument();
    expect(dash).toHaveStyle({ color: '#374151' });
    expect(screen.getByText('Streak (soon)')).toBeInTheDocument();
  });

  it('renders empty state when hasGrids is false', () => {
    render(<StatisticsPane avgCompletion={0} cellsCompleted={0} hasGrids={false} />);
    expect(
      screen.getByText('Complete your first cell to start tracking!')
    ).toBeInTheDocument();
  });

  it('does not render stats values in empty state', () => {
    render(<StatisticsPane avgCompletion={0} cellsCompleted={0} hasGrids={false} />);
    expect(screen.queryByText('Avg completion')).not.toBeInTheDocument();
  });

  it('avg completion value has green color', () => {
    render(<StatisticsPane avgCompletion={75} cellsCompleted={10} hasGrids={true} />);
    const value = screen.getByText('75%');
    expect(value).toHaveStyle({ color: '#10b981' });
  });

  it('cells completed value has light color', () => {
    render(<StatisticsPane avgCompletion={75} cellsCompleted={10} hasGrids={true} />);
    const value = screen.getByText('10');
    expect(value).toHaveStyle({ color: '#f9fafb' });
  });
});
