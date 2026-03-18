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
  getGridById: vi.fn(() => { throw new Error('db exploded'); }),
  deleteGrid: vi.fn(() => { throw new Error('db exploded'); }),
  updateGridFade: vi.fn(() => { throw new Error('db exploded'); }),
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
    const res = await listGrids();
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
