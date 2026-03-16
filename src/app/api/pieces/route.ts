import { NextRequest } from 'next/server';
import { createPiece, listPieces } from '@/controllers/piece';

export async function POST(request: NextRequest) {
  return createPiece(request);
}

export async function GET() {
  return listPieces();
}
