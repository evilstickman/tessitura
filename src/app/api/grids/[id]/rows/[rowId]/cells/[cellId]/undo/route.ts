import { type NextRequest } from 'next/server';
import { undoCompletion } from '@/controllers/cell';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; rowId: string; cellId: string }> },
) {
  const { id, rowId, cellId } = await params;
  return undoCompletion(id, rowId, cellId);
}
