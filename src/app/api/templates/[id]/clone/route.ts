import { type NextRequest } from 'next/server';
import { cloneTemplate } from '@/controllers/template';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return cloneTemplate(id);
}
