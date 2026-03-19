// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
import { PracticeCell, type PracticeCellProps } from '@/components/presentation/PracticeCell';

function makeCell(overrides: Partial<PracticeCellProps> = {}): PracticeCellProps {
  return {
    cellId: 'cell-1',
    stepNumber: 3,
    targetTempoBpm: 106,
    freshnessState: 'incomplete',
    lastCompletionDate: null,
    onComplete: vi.fn(),
    onUndo: vi.fn(),
    ...overrides,
  };
}

function renderInTable(props: PracticeCellProps) {
  return render(
    <table>
      <tbody>
        <tr>
          <PracticeCell {...props} />
        </tr>
      </tbody>
    </table>,
  );
}

describe('PracticeCell', () => {
  describe('freshness state rendering', () => {
    it('renders incomplete state with BPM text and correct colors', () => {
      renderInTable(makeCell({ freshnessState: 'incomplete', targetTempoBpm: 106 }));
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('106');
      expect(button).toHaveStyle({ backgroundColor: '#1f2937', color: '#9ca3af' });
    });

    it('renders fresh state with date and correct colors', () => {
      renderInTable(makeCell({ freshnessState: 'fresh', lastCompletionDate: '2026-03-15' }));
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('3-15');
      expect(button).toHaveStyle({ backgroundColor: '#10b981', color: '#ffffff' });
    });

    it('renders aging state with date and correct colors', () => {
      renderInTable(makeCell({ freshnessState: 'aging', lastCompletionDate: '2026-03-10' }));
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('3-10');
      expect(button).toHaveStyle({ backgroundColor: '#6ee7b7', color: '#064e3b' });
    });

    it('renders stale state with date and correct colors', () => {
      renderInTable(makeCell({ freshnessState: 'stale', lastCompletionDate: '2026-02-28' }));
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('2-28');
      expect(button).toHaveStyle({ backgroundColor: '#a7f3d0', color: '#064e3b' });
    });

    it('renders decayed state with BPM text and correct colors', () => {
      renderInTable(makeCell({ freshnessState: 'decayed', targetTempoBpm: 80, lastCompletionDate: '2026-01-01' }));
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('80');
      expect(button).toHaveStyle({ backgroundColor: '#1f2937', color: '#9ca3af' });
    });
  });

  describe('date formatting', () => {
    it('strips leading zeros from month', () => {
      renderInTable(makeCell({ freshnessState: 'fresh', lastCompletionDate: '2026-03-15' }));
      expect(screen.getByRole('button')).toHaveTextContent('3-15');
    });

    it('strips leading zeros from day', () => {
      renderInTable(makeCell({ freshnessState: 'fresh', lastCompletionDate: '2026-09-05' }));
      expect(screen.getByRole('button')).toHaveTextContent('9-5');
    });

    it('formats double-digit month and day correctly', () => {
      renderInTable(makeCell({ freshnessState: 'fresh', lastCompletionDate: '2026-12-25' }));
      expect(screen.getByRole('button')).toHaveTextContent('12-25');
    });
  });

  describe('interactions', () => {
    it('calls onComplete with cellId on click', async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      renderInTable(makeCell({ cellId: 'cell-42', onComplete }));
      await user.click(screen.getByRole('button'));
      expect(onComplete).toHaveBeenCalledWith('cell-42');
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('calls onUndo with cellId on right-click', async () => {
      const onUndo = vi.fn();
      renderInTable(makeCell({ cellId: 'cell-42', onUndo }));
      const button = screen.getByRole('button');
      // Use fireEvent for contextmenu since userEvent doesn't have right-click
      const { fireEvent } = await import('@testing-library/react');
      fireEvent.contextMenu(button);
      expect(onUndo).toHaveBeenCalledWith('cell-42');
      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('prevents default on right-click', () => {
      renderInTable(makeCell());
      const button = screen.getByRole('button');
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      const prevented = !button.dispatchEvent(event);
      expect(prevented).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('renders a semantic button element', () => {
      renderInTable(makeCell());
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has correct aria-label for incomplete cell', () => {
      renderInTable(makeCell({ stepNumber: 3, targetTempoBpm: 106, freshnessState: 'incomplete' }));
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Complete step 3 at 106 BPM',
      );
    });

    it('has correct aria-label for completed cell', () => {
      renderInTable(makeCell({ stepNumber: 2, freshnessState: 'fresh', lastCompletionDate: '2026-03-15' }));
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Undo step 2, completed 3-15',
      );
    });

    it('has correct aria-label for decayed cell (shows complete label, same as incomplete)', () => {
      renderInTable(makeCell({ stepNumber: 4, freshnessState: 'decayed', targetTempoBpm: 96, lastCompletionDate: '2026-01-01' }));
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Complete step 4 at 96 BPM',
      );
    });

    it('is keyboard focusable', () => {
      renderInTable(makeCell());
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('triggers on Enter key', async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      renderInTable(makeCell({ onComplete, cellId: 'cell-99' }));
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      expect(onComplete).toHaveBeenCalledWith('cell-99');
    });

    it('triggers undo on Delete key', async () => {
      const user = userEvent.setup();
      const onUndo = vi.fn();
      renderInTable(makeCell({ onUndo, cellId: 'cell-99' }));
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Delete}');
      expect(onUndo).toHaveBeenCalledWith('cell-99');
    });

    it('does not suppress visible focus indicator', () => {
      renderInTable(makeCell());
      const button = screen.getByRole('button');
      // Verify no outline:none or outline:0 in inline styles
      const style = button.getAttribute('style') || '';
      expect(style).not.toMatch(/outline\s*:\s*none/);
      expect(style).not.toMatch(/outline\s*:\s*0/);
    });
  });

  describe('DOM structure', () => {
    it('renders button inside td', () => {
      renderInTable(makeCell());
      const button = screen.getByRole('button');
      expect(button.parentElement?.tagName).toBe('TD');
    });
  });
});
