// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  PracticeFocusPane,
  type PracticeFocusPaneProps,
} from '@/components/presentation/PracticeFocusPane';

afterEach(() => cleanup());

function makeSuggestion(
  overrides: Partial<PracticeFocusPaneProps['suggestions'][number]> = {}
) {
  return {
    rowId: 'r1',
    label: 'Invention No. 1',
    gridName: 'Bach Inventions',
    priority: 'HIGH' as const,
    needsPracticeCount: 3,
    href: '/grids/g1',
    allFresh: false,
    ...overrides,
  };
}

describe('PracticeFocusPane', () => {
  it('renders PRACTICE FOCUS header', () => {
    render(<PracticeFocusPane suggestions={[]} />);
    expect(screen.getByText('PRACTICE FOCUS')).toBeInTheDocument();
  });

  it('renders suggestion labels', () => {
    render(<PracticeFocusPane suggestions={[makeSuggestion()]} />);
    expect(screen.getByText('Invention No. 1')).toBeInTheDocument();
  });

  it('renders CRITICAL priority badge', () => {
    render(
      <PracticeFocusPane suggestions={[makeSuggestion({ priority: 'CRITICAL' })]} />
    );
    const badge = screen.getByText('CRIT');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ backgroundColor: '#7f1d1d', color: '#fca5a5' });
  });

  it('renders HIGH priority badge', () => {
    render(
      <PracticeFocusPane suggestions={[makeSuggestion({ priority: 'HIGH' })]} />
    );
    const badge = screen.getByText('HIGH');
    expect(badge).toHaveStyle({ backgroundColor: '#78350f', color: '#fbbf24' });
  });

  it('renders MEDIUM priority badge', () => {
    render(
      <PracticeFocusPane suggestions={[makeSuggestion({ priority: 'MEDIUM' })]} />
    );
    const badge = screen.getByText('MED');
    expect(badge).toHaveStyle({ backgroundColor: '#374151', color: '#9ca3af' });
  });

  it('renders LOW priority badge', () => {
    render(
      <PracticeFocusPane suggestions={[makeSuggestion({ priority: 'LOW' })]} />
    );
    const badge = screen.getByText('LOW');
    expect(badge).toHaveStyle({ backgroundColor: '#374151', color: '#9ca3af' });
  });

  it('shows cells need practice count in subtitle', () => {
    render(
      <PracticeFocusPane suggestions={[makeSuggestion({ needsPracticeCount: 5 })]} />
    );
    expect(
      screen.getByText(/Bach Inventions/)
    ).toHaveTextContent('Bach Inventions \u00b7 5 cells need practice');
  });

  it('shows "All fresh" text when allFresh is true', () => {
    render(
      <PracticeFocusPane
        suggestions={[makeSuggestion({ allFresh: true, needsPracticeCount: 0 })]}
      />
    );
    expect(screen.getByText(/All fresh/)).toBeInTheDocument();
  });

  it('truncates to max 5 suggestions', () => {
    const suggestions = Array.from({ length: 7 }, (_, i) =>
      makeSuggestion({ rowId: `r${i}`, label: `Piece ${i}` })
    );
    render(<PracticeFocusPane suggestions={suggestions} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);
  });

  it('renders empty state', () => {
    render(<PracticeFocusPane suggestions={[]} />);
    expect(
      screen.getByText('Start practicing to see personalized suggestions here')
    ).toBeInTheDocument();
  });

  it('links to correct href', () => {
    render(
      <PracticeFocusPane
        suggestions={[makeSuggestion({ href: '/grids/abc' })]}
      />
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/grids/abc');
  });
});
