import { type NextRequest } from 'next/server';
import { resetCell } from '@/controllers/cell';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; rowId: string; cellId: string }> },
) {
  const { id, rowId, cellId } = await params;
  return resetCell(id, rowId, cellId);
}
