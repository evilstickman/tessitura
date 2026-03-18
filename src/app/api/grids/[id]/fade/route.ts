import { NextRequest } from 'next/server';
import { updateFade } from '@/controllers/grid';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return updateFade(id, request);
}
