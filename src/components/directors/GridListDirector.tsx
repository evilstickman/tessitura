'use client';

import { useQuery } from '@tanstack/react-query';
import { GridList } from '@/components/presentation/GridList';

interface ApiGrid {
  id: string;
  name: string;
}

class AuthError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthError';
  }
}

async function fetchGrids(): Promise<ApiGrid[]> {
  const response = await fetch('/api/grids');

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch grids: ${response.status}`);
  }

  return response.json();
}

export function GridListDirector() {
  const { data: grids, isLoading, error } = useQuery({
    queryKey: ['grids', 'summary'],
    queryFn: fetchGrids,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error instanceof AuthError) {
    return <div>Authentication required</div>;
  }

  if (error) {
    return <div>Failed to load grids.</div>;
  }

  if (!grids) {
    return null;
  }

  return <GridList grids={grids.map((g) => ({ id: g.id, name: g.name }))} />;
}
