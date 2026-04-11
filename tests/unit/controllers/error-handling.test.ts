/**
 * Controller error handling tests — verify that unexpected errors
 * (not AuthenticationError or ValidationError) return 500 INTERNAL_ERROR.
 *
 * These cover the catch-all branches in every controller function.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock auth to succeed (return a userId)
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn(() => Promise.resolve('user-1')),
}));

// Mock models to throw generic errors
vi.mock('@/models/grid', () => ({
  createGrid: vi.fn(() => { throw new Error('db exploded'); }),
  listGrids: vi.fn(() => { throw new Error('db exploded'); }),
  listGridsWithDetail: vi.fn(() => { throw new Error('db exploded'); }),
  getGridById: vi.fn(() => { throw new Error('db exploded'); }),
  deleteGrid: vi.fn(() => { throw new Error('db exploded'); }),
  updateGrid: vi.fn(() => { throw new Error('db exploded'); }),
  updateGridFade: vi.fn(() => { throw new Error('db exploded'); }),
  findOwnedGrid: vi.fn(() => { throw new Error('db exploded'); }),
}));

vi.mock('@/models/session', () => ({
  createSession: vi.fn(() => { throw new Error('db exploded'); }),
  listSessions: vi.fn(() => { throw new Error('db exploded'); }),
  getSessionById: vi.fn(() => { throw new Error('db exploded'); }),
  deleteSession: vi.fn(() => { throw new Error('db exploded'); }),
}));

vi.mock('@/models/goal', () => ({
  createGoal: vi.fn(() => { throw new Error('db exploded'); }),
  listGoals: vi.fn(() => { throw new Error('db exploded'); }),
  getGoalById: vi.fn(() => { throw new Error('db exploded'); }),
  updateGoal: vi.fn(() => { throw new Error('db exploded'); }),
  deleteGoal: vi.fn(() => { throw new Error('db exploded'); }),
}));

vi.mock('@/models/template', () => ({
  listTemplates: vi.fn(() => { throw new Error('db exploded'); }),
  getTemplateById: vi.fn(() => { throw new Error('db exploded'); }),
  cloneTemplate: vi.fn(() => { throw new Error('db exploded'); }),
}));

vi.mock('@/models/piece', () => ({
  createPiece: vi.fn(() => { throw new Error('db exploded'); }),
  listPieces: vi.fn(() => { throw new Error('db exploded'); }),
  getPieceById: vi.fn(() => { throw new Error('db exploded'); }),
  updatePiece: vi.fn(() => { throw new Error('db exploded'); }),
  deletePiece: vi.fn(() => { throw new Error('db exploded'); }),
}));

vi.mock('@/models/row', () => ({
  createRow: vi.fn(() => { throw new Error('db exploded'); }),
  updateRow: vi.fn(() => { throw new Error('db exploded'); }),
  updateRowPriority: vi.fn(() => { throw new Error('db exploded'); }),
  deleteRow: vi.fn(() => { throw new Error('db exploded'); }),
}));

vi.mock('@/models/cell', () => ({
  completeCell: vi.fn(() => { throw new Error('db exploded'); }),
  undoCompletion: vi.fn(() => { throw new Error('db exploded'); }),
  resetCell: vi.fn(() => { throw new Error('db exploded'); }),
}));

function jsonRequest(method: string, body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/test', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_UUID = '00000000-0000-0000-0000-000000000001';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Grid controller ─────────────────────────────────────────────────────────

describe('Grid controller — unexpected errors → 500', () => {
  it('createGrid returns 500 on unexpected error', async () => {
    const { createGrid } = await import('@/controllers/grid');
    const req = jsonRequest('POST', { name: 'Test Grid' });
    const res = await createGrid(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('listGrids returns 500 on unexpected error', async () => {
    const { listGrids } = await import('@/controllers/grid');
    const req = new NextRequest('http://localhost:3000/api/grids');
    const res = await listGrids(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('getGrid returns 500 on unexpected error', async () => {
    const { getGrid } = await import('@/controllers/grid');
    const res = await getGrid(VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('deleteGrid returns 500 on unexpected error', async () => {
    const { deleteGrid } = await import('@/controllers/grid');
    const res = await deleteGrid(VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('updateFade returns 500 on unexpected error', async () => {
    const { updateFade } = await import('@/controllers/grid');
    const req = jsonRequest('PUT', { fadeEnabled: true });
    const res = await updateFade(VALID_UUID, req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('updateGrid returns 500 on unexpected error', async () => {
    const { updateGrid } = await import('@/controllers/grid');
    const req = jsonRequest('PUT', { name: 'Renamed' });
    const res = await updateGrid(VALID_UUID, req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});

// ─── Session controller ─────────────────────────────────────────────────────

describe('Session controller — unexpected errors → 500', () => {
  it('createSession returns 500 on unexpected error', async () => {
    const { createSession } = await import('@/controllers/session');
    const req = jsonRequest('POST', { sessionDate: '2026-04-01', durationMinutes: 30 });
    const res = await createSession(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('listSessions returns 500 on unexpected error', async () => {
    const { listSessions } = await import('@/controllers/session');
    const req = new NextRequest('http://localhost:3000/api/sessions');
    const res = await listSessions(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('getSession returns 500 on unexpected error', async () => {
    const { getSession } = await import('@/controllers/session');
    const res = await getSession(VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('deleteSession returns 500 on unexpected error', async () => {
    const { deleteSession } = await import('@/controllers/session');
    const res = await deleteSession(VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});

// ─── Goal controller ────────────────────────────────────────────────────────

describe('Goal controller — unexpected errors → 500', () => {
  it('createGoal returns 500 on unexpected error', async () => {
    const { createGoal } = await import('@/controllers/goal');
    const req = jsonRequest('POST', { goalType: 'DAILY_MINUTES', targetValue: 30 });
    const res = await createGoal(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('listGoals returns 500 on unexpected error', async () => {
    const { listGoals } = await import('@/controllers/goal');
    const req = new NextRequest('http://localhost:3000/api/goals');
    const res = await listGoals(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('getGoal returns 500 on unexpected error', async () => {
    const { getGoal } = await import('@/controllers/goal');
    const res = await getGoal(VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('updateGoal returns 500 on unexpected error', async () => {
    const { updateGoal } = await import('@/controllers/goal');
    const req = jsonRequest('PUT', { targetValue: 60 });
    const res = await updateGoal(VALID_UUID, req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('deleteGoal returns 500 on unexpected error', async () => {
    const { deleteGoal } = await import('@/controllers/goal');
    const res = await deleteGoal(VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});

// ─── Template controller ────────────────────────────────────────────────────

describe('Template controller — unexpected errors → 500', () => {
  it('listTemplates returns 500 on unexpected error', async () => {
    const { listTemplates } = await import('@/controllers/template');
    const req = new NextRequest('http://localhost:3000/api/templates');
    const res = await listTemplates(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('getTemplate returns 500 on unexpected error', async () => {
    const { getTemplate } = await import('@/controllers/template');
    const res = await getTemplate(VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('cloneTemplate returns 500 on unexpected error', async () => {
    const { cloneTemplate } = await import('@/controllers/template');
    const res = await cloneTemplate(VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});

// ─── Piece controller ────────────────────────────────────────────────────────

describe('Piece controller — unexpected errors → 500', () => {
  it('createPiece returns 500 on unexpected error', async () => {
    const { createPiece } = await import('@/controllers/piece');
    const req = jsonRequest('POST', { title: 'Test Piece' });
    const res = await createPiece(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('listPieces returns 500 on unexpected error', async () => {
    const { listPieces } = await import('@/controllers/piece');
    const res = await listPieces();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('getPiece returns 500 on unexpected error', async () => {
    const { getPiece } = await import('@/controllers/piece');
    const res = await getPiece(VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('updatePiece returns 500 on unexpected error', async () => {
    const { updatePiece } = await import('@/controllers/piece');
    const req = jsonRequest('PUT', { title: 'Updated' });
    const res = await updatePiece(VALID_UUID, req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('deletePiece returns 500 on unexpected error', async () => {
    const { deletePiece } = await import('@/controllers/piece');
    const res = await deletePiece(VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});

// ─── Row controller ──────────────────────────────────────────────────────────

describe('Row controller — unexpected errors → 500', () => {
  it('createRow returns 500 on unexpected error', async () => {
    const { createRow } = await import('@/controllers/row');
    const req = jsonRequest('POST', {
      startMeasure: 1, endMeasure: 4, targetTempo: 120, steps: 5,
    });
    const res = await createRow(VALID_UUID, req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('updateRow returns 500 on unexpected error', async () => {
    const { updateRow } = await import('@/controllers/row');
    const req = jsonRequest('PUT', { startMeasure: 2 });
    const res = await updateRow(VALID_UUID, VALID_UUID, req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('updatePriority returns 500 on unexpected error', async () => {
    const { updatePriority } = await import('@/controllers/row');
    const req = jsonRequest('PUT', { priority: 'HIGH' });
    const res = await updatePriority(VALID_UUID, VALID_UUID, req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('deleteRow returns 500 on unexpected error', async () => {
    const { deleteRow } = await import('@/controllers/row');
    const res = await deleteRow(VALID_UUID, VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});

// ─── Cell controller ──────────────────────────────────────────────────────────

describe('Cell controller — unexpected errors → 500', () => {
  it('completeCell returns 500 on unexpected error', async () => {
    const { completeCell } = await import('@/controllers/cell');
    const res = await completeCell(VALID_UUID, VALID_UUID, VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('undoCompletion returns 500 on unexpected error', async () => {
    const { undoCompletion } = await import('@/controllers/cell');
    const res = await undoCompletion(VALID_UUID, VALID_UUID, VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('resetCell returns 500 on unexpected error', async () => {
    const { resetCell } = await import('@/controllers/cell');
    const res = await resetCell(VALID_UUID, VALID_UUID, VALID_UUID);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});
