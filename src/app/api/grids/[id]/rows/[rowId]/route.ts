import { NextRequest } from 'next/server';
import { updateRow, deleteRow } from '@/controllers/row';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rowId: string }> },
) {
  const { id, rowId } = await params;
  return updateRow(id, rowId, request);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; rowId: string }> },
) {
  const { id, rowId } = await params;
  return deleteRow(id, rowId);
}
