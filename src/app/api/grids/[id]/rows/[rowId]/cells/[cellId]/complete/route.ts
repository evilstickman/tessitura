import { type NextRequest } from 'next/server';
import { completeCell } from '@/controllers/cell';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; rowId: string; cellId: string }> },
) {
  const { id, rowId, cellId } = await params;
  return completeCell(id, rowId, cellId);
}
