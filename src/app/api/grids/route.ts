import { NextRequest } from 'next/server';
import { createGrid, listGrids } from '@/controllers/grid';

export async function POST(request: NextRequest) {
  return createGrid(request);
}

export async function GET() {
  return listGrids();
}
