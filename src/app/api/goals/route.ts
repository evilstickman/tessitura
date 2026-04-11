import { NextRequest } from 'next/server';
import { createGoal, listGoals } from '@/controllers/goal';

export async function POST(request: NextRequest) {
  return createGoal(request);
}

export async function GET(request: NextRequest) {
  return listGoals(request);
}
