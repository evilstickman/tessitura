// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GridList } from '@/components/presentation/GridList';

afterEach(() => cleanup());

describe('GridList', () => {
  it('renders links with correct hrefs for each grid', () => {
    const grids = [
      { id: 'grid-1', name: 'Bach Partita' },
      { id: 'grid-2', name: 'Scales Practice' },
    ];

    render(<GridList grids={grids} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);

    expect(links[0]).toHaveTextContent('Bach Partita');
    expect(links[0]).toHaveAttribute('href', '/grids/grid-1');

    expect(links[1]).toHaveTextContent('Scales Practice');
    expect(links[1]).toHaveAttribute('href', '/grids/grid-2');
  });

  it('renders empty state when no grids', () => {
    render(<GridList grids={[]} />);

    expect(screen.getByText('No practice grids yet.')).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
