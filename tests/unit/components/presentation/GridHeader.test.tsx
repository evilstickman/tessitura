// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { GridHeader, type GridHeaderProps } from '@/components/presentation/GridHeader';

afterEach(() => cleanup());

function makeHeader(overrides: Partial<GridHeaderProps> = {}): GridHeaderProps {
  return {
    name: 'Bach Inventions',
    notes: 'Focus on voice independence',
    fadeEnabled: true,
    completionPercentage: 65,
    freshnessSummary: {
      fresh: 10,
      aging: 5,
      stale: 3,
      decayed: 2,
      incomplete: 0,
    },
    onToggleFade: vi.fn(),
    ...overrides,
  };
}

describe('GridHeader', () => {
  describe('basic rendering', () => {
    it('renders the grid name as h1', () => {
      render(<GridHeader {...makeHeader()} />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Bach Inventions');
    });

    it('renders notes when present', () => {
      render(<GridHeader {...makeHeader({ notes: 'Some notes here' })} />);
      expect(screen.getByText('Some notes here')).toBeInTheDocument();
    });

    it('does not render notes section when null', () => {
      render(<GridHeader {...makeHeader({ notes: null })} />);
      expect(screen.queryByText('Focus on voice independence')).not.toBeInTheDocument();
    });
  });

  describe('completion percentage', () => {
    it('displays completion percentage', () => {
      render(<GridHeader {...makeHeader({ completionPercentage: 65 })} />);
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('renders progress bar with correct fill width', () => {
      render(<GridHeader {...makeHeader({ completionPercentage: 42 })} />);
      const progressFill = screen.getByTestId('progress-fill');
      expect(progressFill).toHaveStyle({ width: '42%' });
    });
  });

  describe('freshness summary', () => {
    it('shows only non-zero freshness states', () => {
      render(<GridHeader {...makeHeader({
        freshnessSummary: { fresh: 10, aging: 5, stale: 0, decayed: 2, incomplete: 0 },
      })} />);
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      // stale=0 and incomplete=0 should not be shown
      expect(screen.queryByText('stale')).not.toBeInTheDocument();
      expect(screen.queryByText('incomplete')).not.toBeInTheDocument();
    });

    it('renders freshness squares with correct colors', () => {
      render(<GridHeader {...makeHeader({
        freshnessSummary: { fresh: 3, aging: 0, stale: 0, decayed: 1, incomplete: 0 },
      })} />);
      const freshSquare = screen.getByTestId('freshness-square-fresh');
      expect(freshSquare).toHaveStyle({ backgroundColor: '#10b981' });
      const decayedSquare = screen.getByTestId('freshness-square-decayed');
      expect(decayedSquare).toHaveStyle({ backgroundColor: '#374151' });
    });
  });

  describe('fade toggle', () => {
    it('calls onToggleFade when clicked', async () => {
      const user = userEvent.setup();
      const onToggleFade = vi.fn();
      render(<GridHeader {...makeHeader({ onToggleFade })} />);
      const toggle = screen.getByRole('switch');
      await user.click(toggle);
      expect(onToggleFade).toHaveBeenCalledTimes(1);
    });

    it('shows green when fade is enabled', () => {
      render(<GridHeader {...makeHeader({ fadeEnabled: true })} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      expect(toggle).toHaveStyle({ backgroundColor: '#10b981' });
    });

    it('shows gray when fade is disabled', () => {
      render(<GridHeader {...makeHeader({ fadeEnabled: false })} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      expect(toggle).toHaveStyle({ backgroundColor: '#374151' });
    });
  });

  describe('collapse/expand', () => {
    it('hides notes and summary when collapsed', async () => {
      const user = userEvent.setup();
      render(<GridHeader {...makeHeader({ notes: 'Some notes' })} />);
      // Find and click the collapse button
      const collapseBtn = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseBtn);
      // Notes should be hidden
      expect(screen.queryByText('Some notes')).not.toBeInTheDocument();
      // Freshness labels should be hidden
      expect(screen.queryByText('fresh')).not.toBeInTheDocument();
    });

    it('restores notes and summary when expanded again', async () => {
      const user = userEvent.setup();
      render(<GridHeader {...makeHeader({ notes: 'Some notes' })} />);
      const collapseBtn = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseBtn);
      // Now expand
      const expandBtn = screen.getByRole('button', { name: /expand/i });
      await user.click(expandBtn);
      expect(screen.getByText('Some notes')).toBeInTheDocument();
    });

    it('still shows name when collapsed', async () => {
      const user = userEvent.setup();
      render(<GridHeader {...makeHeader()} />);
      const collapseBtn = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseBtn);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bach Inventions');
    });

    it('still shows progress bar when collapsed', async () => {
      const user = userEvent.setup();
      render(<GridHeader {...makeHeader({ completionPercentage: 65 })} />);
      const collapseBtn = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseBtn);
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('still shows fade toggle when collapsed', async () => {
      const user = userEvent.setup();
      render(<GridHeader {...makeHeader()} />);
      const collapseBtn = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseBtn);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });
  });
});
