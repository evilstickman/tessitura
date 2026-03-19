import Link from 'next/link';

interface GridSummary {
  id: string;
  name: string;
}

export interface GridListProps {
  grids: GridSummary[];
}

export function GridList({ grids }: GridListProps) {
  if (grids.length === 0) {
    return (
      <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
        No practice grids yet.
      </p>
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {grids.map((grid) => (
        <li key={grid.id} style={{ marginBottom: '8px' }}>
          <Link
            href={`/grids/${grid.id}`}
            style={{
              color: '#60a5fa',
              textDecoration: 'none',
              fontSize: '1.125rem',
            }}
          >
            {grid.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
