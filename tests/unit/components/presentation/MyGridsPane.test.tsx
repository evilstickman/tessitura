// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MyGridsPane, type MyGridsPaneProps } from '@/components/presentation/MyGridsPane';

afterEach(() => cleanup());

function makeGrid(overrides: Partial<MyGridsPaneProps['grids'][number]> = {}) {
  return {
    id: 'g1',
    name: 'Bach Inventions',
    completionPercentage: 65,
    updatedAt: '2026-03-15T10:00:00.000Z',
    attentionCount: 3,
    ...overrides,
  };
}

const defaultProps: MyGridsPaneProps = {
  grids: [makeGrid()],
  onNewGrid: vi.fn(),
  showForm: false,
  onSubmitGrid: vi.fn(),
  onCancelForm: vi.fn(),
};

describe('MyGridsPane', () => {
  it('renders grid cards with name', () => {
    render(<MyGridsPane {...defaultProps} />);
    expect(screen.getByText('Bach Inventions')).toBeInTheDocument();
  });

  it('renders completion percentage', () => {
    render(<MyGridsPane {...defaultProps} />);
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('renders formatted date as M/D (strips leading zeros from month and day)', () => {
    render(<MyGridsPane {...defaultProps} />);
    expect(screen.getByText('Updated 3/15')).toBeInTheDocument();
  });

  it('strips leading zero from single-digit day', () => {
    render(<MyGridsPane {...defaultProps} grids={[makeGrid({ updatedAt: '2026-09-05T00:00:00.000Z' })]} />);
    expect(screen.getByText('Updated 9/5')).toBeInTheDocument();
  });

  it('renders attention count when > 0', () => {
    render(<MyGridsPane {...defaultProps} />);
    expect(screen.getByText('3 cells need attention')).toBeInTheDocument();
  });

  it('does not render attention text when attentionCount is 0', () => {
    render(<MyGridsPane {...defaultProps} grids={[makeGrid({ attentionCount: 0 })]} />);
    expect(screen.queryByText(/cells need attention/)).not.toBeInTheDocument();
  });

  it('truncates to 5 grids and shows "See all" link', () => {
    const grids = Array.from({ length: 7 }, (_, i) =>
      makeGrid({ id: `g${i}`, name: `Grid ${i}` })
    );
    render(<MyGridsPane {...defaultProps} grids={grids} />);

    // 5 grid links + 1 "See all" link = 6
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(6);
    expect(screen.getByText(/See all/)).toBeInTheDocument();
    const seeAll = screen.getByText(/See all/);
    expect(seeAll.closest('a')).toHaveAttribute('href', '/grids');
  });

  it('does not show "See all" for 5 or fewer grids', () => {
    render(<MyGridsPane {...defaultProps} />);
    expect(screen.queryByText(/See all/)).not.toBeInTheDocument();
  });

  it('shows empty state when no grids', () => {
    render(<MyGridsPane {...defaultProps} grids={[]} />);
    expect(screen.getByText('No practice grids yet.')).toBeInTheDocument();
  });

  it('calls onNewGrid when "+ New Grid" button clicked', async () => {
    const user = userEvent.setup();
    const onNewGrid = vi.fn();
    render(<MyGridsPane {...defaultProps} onNewGrid={onNewGrid} />);

    await user.click(screen.getByRole('button', { name: /New Grid/i }));
    expect(onNewGrid).toHaveBeenCalled();
  });

  it('shows GridCreateForm when showForm is true', () => {
    render(<MyGridsPane {...defaultProps} showForm={true} />);
    expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
  });

  it('New Grid button is keyboard-focusable and activatable', async () => {
    const user = userEvent.setup();
    const onNewGrid = vi.fn();
    render(<MyGridsPane {...defaultProps} onNewGrid={onNewGrid} />);

    const btn = screen.getByRole('button', { name: /New Grid/i });
    expect(btn.getAttribute('tabindex')).not.toBe('-1');

    btn.focus();
    await user.keyboard('{Enter}');
    expect(onNewGrid).toHaveBeenCalled();
  });

  it('grid card links to /grids/{id}', () => {
    render(<MyGridsPane {...defaultProps} />);
    const link = screen.getByRole('link', { name: /Bach Inventions/ });
    expect(link).toHaveAttribute('href', '/grids/g1');
  });

  it('renders MY GRIDS header', () => {
    render(<MyGridsPane {...defaultProps} />);
    expect(screen.getByText('MY GRIDS')).toBeInTheDocument();
  });
});
