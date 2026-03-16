import { NextResponse } from 'next/server';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { message, code } }, { status });
}
