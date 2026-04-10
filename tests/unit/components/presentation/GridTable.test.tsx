// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GridTable, type GridTableProps } from '@/components/presentation/GridTable';
import type { FreshnessState } from '@/lib/freshness';

afterEach(() => cleanup());

function makeCell(id: string, step: number) {
  return {
    cellId: id,
    stepNumber: step,
    targetTempoBpm: 80,
    freshnessState: 'incomplete' as FreshnessState,
    lastCompletionDate: null,
  };
}

function makeRowData(id: string, title: string) {
  return {
    rowId: id,
    piece: { title, composer: null },
    passageLabel: null,
    startMeasure: 1,
    endMeasure: 8,
    priority: 'MEDIUM',
    cells: [makeCell(`${id}-c1`, 1), makeCell(`${id}-c2`, 2)],
  };
}

function makeTable(overrides: Partial<GridTableProps> = {}): GridTableProps {
  return {
    rows: [
      makeRowData('row-1', 'Piece A'),
      makeRowData('row-2', 'Piece B'),
      makeRowData('row-3', 'Piece C'),
    ],
    onComplete: vi.fn(),
    onUndo: vi.fn(),
    ...overrides,
  };
}

describe('GridTable', () => {
  it('renders the correct number of body rows', () => {
    render(<GridTable {...makeTable()} />);
    // 1 thead row + 3 body rows = 4 total
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4);
    // Each row has a row-header <th scope="row">
    const rowHeaders = screen.getAllByRole('rowheader');
    expect(rowHeaders).toHaveLength(3);
  });

  it('renders helper legend text', () => {
    render(<GridTable {...makeTable()} />);
    expect(screen.getByText(/Click to complete/)).toBeInTheDocument();
    expect(screen.getByText(/Right-click or Delete key to undo/)).toBeInTheDocument();
  });

  it('scrollable container has overflow-x: auto', () => {
    const { container } = render(<GridTable {...makeTable()} />);
    const scrollDiv = container.firstElementChild as HTMLElement;
    expect(scrollDiv).toHaveStyle({ overflowX: 'auto' });
  });

  it('passes onComplete to rows with rowId binding', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<GridTable {...makeTable({ onComplete })} />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(onComplete).toHaveBeenCalledWith('row-1', 'row-1-c1');
  });

  it('table has caption and thead for accessibility', () => {
    render(<GridTable {...makeTable()} />);
    // Caption describes the table for screen readers
    expect(screen.getByText(/Practice grid — each row is a passage/)).toBeInTheDocument();
    // thead contributes column headers
    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders.length).toBeGreaterThanOrEqual(2);
  });

  it('renders with zero body rows', () => {
    render(<GridTable {...makeTable({ rows: [] })} />);
    expect(screen.getByText(/Click to complete/)).toBeInTheDocument();
    // Only the thead row exists when body is empty
    expect(screen.queryAllByRole('row')).toHaveLength(1);
    expect(screen.queryAllByRole('rowheader')).toHaveLength(0);
  });
});
