import { NextRequest } from 'next/server';
import { createRow } from '@/controllers/row';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return createRow(id, request);
}
