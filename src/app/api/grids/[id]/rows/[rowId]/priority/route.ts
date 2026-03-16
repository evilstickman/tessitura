import { NextRequest } from 'next/server';
import { updatePriority } from '@/controllers/row';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rowId: string }> },
) {
  const { id, rowId } = await params;
  return updatePriority(id, rowId, request);
}
