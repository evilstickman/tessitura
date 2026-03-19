// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { GridRow, type GridRowProps } from '@/components/presentation/GridRow';
import type { FreshnessState } from '@/models/freshness';

afterEach(() => cleanup());

function makeCell(overrides: Partial<GridRowProps['cells'][number]> = {}): GridRowProps['cells'][number] {
  return {
    cellId: 'cell-1',
    stepNumber: 1,
    targetTempoBpm: 80,
    freshnessState: 'incomplete' as FreshnessState,
    lastCompletionDate: null,
    ...overrides,
  };
}

function makeRow(overrides: Partial<GridRowProps> = {}): GridRowProps {
  return {
    rowId: 'row-1',
    piece: { title: 'Clair de Lune', composer: 'Debussy' },
    passageLabel: 'A section',
    startMeasure: 1,
    endMeasure: 16,
    priority: 'HIGH',
    cells: [
      makeCell({ cellId: 'cell-1', stepNumber: 1, targetTempoBpm: 80 }),
      makeCell({ cellId: 'cell-2', stepNumber: 2, targetTempoBpm: 100 }),
    ],
    onComplete: vi.fn(),
    onUndo: vi.fn(),
    ...overrides,
  };
}

function renderInTable(props: GridRowProps) {
  return render(
    <table>
      <tbody>
        <GridRow {...props} />
      </tbody>
    </table>,
  );
}

describe('GridRow', () => {
  describe('row header label', () => {
    it('renders piece title + passageLabel when both present', () => {
      renderInTable(makeRow({
        piece: { title: 'Clair de Lune', composer: 'Debussy' },
        passageLabel: 'A section',
      }));
      expect(screen.getByText('Clair de Lune — A section')).toBeInTheDocument();
    });

    it('renders piece title only when no passageLabel', () => {
      renderInTable(makeRow({
        piece: { title: 'Clair de Lune', composer: 'Debussy' },
        passageLabel: null,
      }));
      expect(screen.getByText('Clair de Lune')).toBeInTheDocument();
    });

    it('renders passageLabel only when no piece', () => {
      renderInTable(makeRow({
        piece: null,
        passageLabel: 'Bridge',
      }));
      expect(screen.getByText('Bridge')).toBeInTheDocument();
    });

    it('renders "Untitled" when neither piece nor passageLabel', () => {
      renderInTable(makeRow({
        piece: null,
        passageLabel: null,
      }));
      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });
  });

  describe('measures and priority', () => {
    it('renders measure range and priority', () => {
      renderInTable(makeRow({ startMeasure: 1, endMeasure: 16, priority: 'HIGH' }));
      expect(screen.getByText(/mm\. 1–16/)).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('renders HIGH priority in correct color', () => {
      renderInTable(makeRow({ priority: 'HIGH' }));
      const priorityEl = screen.getByText('HIGH');
      expect(priorityEl).toHaveStyle({ color: '#fbbf24' });
    });

    it('renders CRITICAL priority in correct color', () => {
      renderInTable(makeRow({ priority: 'CRITICAL' }));
      const priorityEl = screen.getByText('CRITICAL');
      expect(priorityEl).toHaveStyle({ color: '#ef4444' });
    });

    it('renders MEDIUM priority in correct color', () => {
      renderInTable(makeRow({ priority: 'MEDIUM' }));
      const priorityEl = screen.getByText('MEDIUM');
      expect(priorityEl).toHaveStyle({ color: '#9ca3af' });
    });

    it('renders LOW priority in correct color', () => {
      renderInTable(makeRow({ priority: 'LOW' }));
      const priorityEl = screen.getByText('LOW');
      expect(priorityEl).toHaveStyle({ color: '#9ca3af' });
    });
  });

  describe('cells', () => {
    it('renders correct number of cells', () => {
      renderInTable(makeRow({
        cells: [
          makeCell({ cellId: 'c1' }),
          makeCell({ cellId: 'c2' }),
          makeCell({ cellId: 'c3' }),
        ],
      }));
      // 1 header td + 3 cell tds = 3 buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });
  });

  describe('callback binding', () => {
    it('binds rowId to onComplete callback', async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      renderInTable(makeRow({ rowId: 'row-42', onComplete }));
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);
      expect(onComplete).toHaveBeenCalledWith('row-42', 'cell-1');
    });

    it('binds rowId to onUndo callback', () => {
      const onUndo = vi.fn();
      renderInTable(makeRow({ rowId: 'row-42', onUndo }));
      const buttons = screen.getAllByRole('button');
      fireEvent.contextMenu(buttons[0]);
      expect(onUndo).toHaveBeenCalledWith('row-42', 'cell-1');
    });
  });

  describe('DOM structure', () => {
    it('renders as a tr element', () => {
      const { container } = renderInTable(makeRow());
      const rows = container.querySelectorAll('tr');
      // table > tbody > tr (our row)
      expect(rows.length).toBe(1);
    });
  });
});
