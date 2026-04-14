import { NextRequest } from 'next/server';
import { createSession, listSessions } from '@/controllers/session';

export async function POST(request: NextRequest) {
  return createSession(request);
}

export async function GET(request: NextRequest) {
  return listSessions(request);
}
