import { NextRequest } from 'next/server';
import { listTemplates } from '@/controllers/template';

export async function GET(request: NextRequest) {
  return listTemplates(request);
}
