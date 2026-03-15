import { type NextRequest } from 'next/server';
import { getGrid, deleteGrid } from '@/controllers/grid';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return getGrid(id);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return deleteGrid(id);
}
