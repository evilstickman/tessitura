import { type NextRequest } from 'next/server';
import { getTemplate } from '@/controllers/template';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return getTemplate(id);
}
