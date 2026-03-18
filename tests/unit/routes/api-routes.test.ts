/**
 * Route handler tests — verify that Next.js route files correctly
 * extract params and delegate to controllers.
 *
 * These are thin wrappers, so we test delegation behavior:
 * each route handler should call its controller with the right arguments
 * and return whatever the controller returns.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock controllers before importing routes
vi.mock('@/controllers/grid', () => ({
  createGrid: vi.fn(() => NextResponse.json({ mock: 'createGrid' }, { status: 201 })),
  listGrids: vi.fn(() => NextResponse.json({ mock: 'listGrids' })),
  getGrid: vi.fn(() => NextResponse.json({ mock: 'getGrid' })),
  deleteGrid: vi.fn(() => new NextResponse(null, { status: 204 })),
  updateFade: vi.fn(() => NextResponse.json({ mock: 'updateFade' })),
}));

vi.mock('@/controllers/cell', () => ({
  completeCell: vi.fn(() => NextResponse.json({ mock: 'completeCell' }, { status: 201 })),
  undoCompletion: vi.fn(() => NextResponse.json({ mock: 'undoCompletion' })),
  resetCell: vi.fn(() => NextResponse.json({ mock: 'resetCell' })),
}));

vi.mock('@/controllers/piece', () => ({
  createPiece: vi.fn(() => NextResponse.json({ mock: 'createPiece' }, { status: 201 })),
  listPieces: vi.fn(() => NextResponse.json({ mock: 'listPieces' })),
  getPiece: vi.fn(() => NextResponse.json({ mock: 'getPiece' })),
  updatePiece: vi.fn(() => NextResponse.json({ mock: 'updatePiece' })),
  deletePiece: vi.fn(() => new NextResponse(null, { status: 204 })),
}));

vi.mock('@/controllers/row', () => ({
  createRow: vi.fn(() => NextResponse.json({ mock: 'createRow' }, { status: 201 })),
  updateRow: vi.fn(() => NextResponse.json({ mock: 'updateRow' })),
  updatePriority: vi.fn(() => NextResponse.json({ mock: 'updatePriority' })),
  deleteRow: vi.fn(() => new NextResponse(null, { status: 204 })),
}));

function makeRequest(method = 'GET', url = 'http://localhost:3000/test'): NextRequest {
  return new NextRequest(url, { method });
}

function makeParams<T extends Record<string, string>>(obj: T): { params: Promise<T> } {
  return { params: Promise.resolve(obj) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Grid routes ──────────────────────────────────────────────────────────────

describe('Grid routes — /api/grids', () => {
  it('POST delegates to createGrid', async () => {
    const { POST } = await import('@/app/api/grids/route');
    const { createGrid } = await import('@/controllers/grid');
    const req = makeRequest('POST');

    const res = await POST(req);
    expect(createGrid).toHaveBeenCalledWith(req);
    expect(res.status).toBe(201);
  });

  it('GET delegates to listGrids', async () => {
    const { GET } = await import('@/app/api/grids/route');
    const { listGrids } = await import('@/controllers/grid');

    const res = await GET();
    expect(listGrids).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});

describe('Grid routes — /api/grids/[id]', () => {
  it('GET extracts id and delegates to getGrid', async () => {
    const { GET } = await import('@/app/api/grids/[id]/route');
    const { getGrid } = await import('@/controllers/grid');
    const req = makeRequest();
    const params = makeParams({ id: 'test-grid-id' });

    await GET(req, params);
    expect(getGrid).toHaveBeenCalledWith('test-grid-id');
  });

  it('DELETE extracts id and delegates to deleteGrid', async () => {
    const { DELETE } = await import('@/app/api/grids/[id]/route');
    const { deleteGrid } = await import('@/controllers/grid');
    const req = makeRequest('DELETE');
    const params = makeParams({ id: 'test-grid-id' });

    await DELETE(req, params);
    expect(deleteGrid).toHaveBeenCalledWith('test-grid-id');
  });
});

// ─── Piece routes ─────────────────────────────────────────────────────────────

describe('Piece routes — /api/pieces', () => {
  it('POST delegates to createPiece', async () => {
    const { POST } = await import('@/app/api/pieces/route');
    const { createPiece } = await import('@/controllers/piece');
    const req = makeRequest('POST');

    await POST(req);
    expect(createPiece).toHaveBeenCalledWith(req);
  });

  it('GET delegates to listPieces', async () => {
    const { GET } = await import('@/app/api/pieces/route');
    const { listPieces } = await import('@/controllers/piece');

    await GET();
    expect(listPieces).toHaveBeenCalled();
  });
});

describe('Piece routes — /api/pieces/[id]', () => {
  it('GET extracts id and delegates to getPiece', async () => {
    const { GET } = await import('@/app/api/pieces/[id]/route');
    const { getPiece } = await import('@/controllers/piece');
    const req = makeRequest();
    const params = makeParams({ id: 'test-piece-id' });

    await GET(req, params);
    expect(getPiece).toHaveBeenCalledWith('test-piece-id');
  });

  it('PUT extracts id and delegates to updatePiece', async () => {
    const { PUT } = await import('@/app/api/pieces/[id]/route');
    const { updatePiece } = await import('@/controllers/piece');
    const req = makeRequest('PUT');
    const params = makeParams({ id: 'test-piece-id' });

    await PUT(req, params);
    expect(updatePiece).toHaveBeenCalledWith('test-piece-id', req);
  });

  it('DELETE extracts id and delegates to deletePiece', async () => {
    const { DELETE } = await import('@/app/api/pieces/[id]/route');
    const { deletePiece } = await import('@/controllers/piece');
    const req = makeRequest('DELETE');
    const params = makeParams({ id: 'test-piece-id' });

    await DELETE(req, params);
    expect(deletePiece).toHaveBeenCalledWith('test-piece-id');
  });
});

// ─── Row routes ───────────────────────────────────────────────────────────────

describe('Row routes — /api/grids/[id]/rows', () => {
  it('POST extracts gridId and delegates to createRow', async () => {
    const { POST } = await import('@/app/api/grids/[id]/rows/route');
    const { createRow } = await import('@/controllers/row');
    const req = makeRequest('POST');
    const params = makeParams({ id: 'test-grid-id' });

    await POST(req, params);
    expect(createRow).toHaveBeenCalledWith('test-grid-id', req);
  });
});

describe('Row routes — /api/grids/[id]/rows/[rowId]', () => {
  it('PUT extracts gridId and rowId and delegates to updateRow', async () => {
    const { PUT } = await import('@/app/api/grids/[id]/rows/[rowId]/route');
    const { updateRow } = await import('@/controllers/row');
    const req = makeRequest('PUT');
    const params = makeParams({ id: 'grid-1', rowId: 'row-1' });

    await PUT(req, params);
    expect(updateRow).toHaveBeenCalledWith('grid-1', 'row-1', req);
  });

  it('DELETE extracts gridId and rowId and delegates to deleteRow', async () => {
    const { DELETE } = await import('@/app/api/grids/[id]/rows/[rowId]/route');
    const { deleteRow } = await import('@/controllers/row');
    const req = makeRequest('DELETE');
    const params = makeParams({ id: 'grid-1', rowId: 'row-1' });

    await DELETE(req, params);
    expect(deleteRow).toHaveBeenCalledWith('grid-1', 'row-1');
  });
});

describe('Row routes — /api/grids/[id]/rows/[rowId]/priority', () => {
  it('PUT extracts gridId and rowId and delegates to updatePriority', async () => {
    const { PUT } = await import('@/app/api/grids/[id]/rows/[rowId]/priority/route');
    const { updatePriority } = await import('@/controllers/row');
    const req = makeRequest('PUT');
    const params = makeParams({ id: 'grid-1', rowId: 'row-1' });

    await PUT(req, params);
    expect(updatePriority).toHaveBeenCalledWith('grid-1', 'row-1', req);
  });
});

// ─── Cell routes ──────────────────────────────────────────────────────────────

describe('Cell routes — /api/grids/[id]/rows/[rowId]/cells/[cellId]/complete', () => {
  it('POST extracts ids and delegates to completeCell', async () => {
    const { POST } = await import('@/app/api/grids/[id]/rows/[rowId]/cells/[cellId]/complete/route');
    const { completeCell } = await import('@/controllers/cell');
    const req = makeRequest('POST');
    const params = makeParams({ id: 'grid-1', rowId: 'row-1', cellId: 'cell-1' });

    const res = await POST(req, params);
    expect(completeCell).toHaveBeenCalledWith('grid-1', 'row-1', 'cell-1');
    expect(res.status).toBe(201);
  });
});

describe('Cell routes — /api/grids/[id]/rows/[rowId]/cells/[cellId]/undo', () => {
  it('POST extracts ids and delegates to undoCompletion', async () => {
    const { POST } = await import('@/app/api/grids/[id]/rows/[rowId]/cells/[cellId]/undo/route');
    const { undoCompletion } = await import('@/controllers/cell');
    const req = makeRequest('POST');
    const params = makeParams({ id: 'grid-1', rowId: 'row-1', cellId: 'cell-1' });

    const res = await POST(req, params);
    expect(undoCompletion).toHaveBeenCalledWith('grid-1', 'row-1', 'cell-1');
    expect(res.status).toBe(200);
  });
});

describe('Cell routes — /api/grids/[id]/rows/[rowId]/cells/[cellId]/reset', () => {
  it('POST extracts ids and delegates to resetCell', async () => {
    const { POST } = await import('@/app/api/grids/[id]/rows/[rowId]/cells/[cellId]/reset/route');
    const { resetCell } = await import('@/controllers/cell');
    const req = makeRequest('POST');
    const params = makeParams({ id: 'grid-1', rowId: 'row-1', cellId: 'cell-1' });

    const res = await POST(req, params);
    expect(resetCell).toHaveBeenCalledWith('grid-1', 'row-1', 'cell-1');
    expect(res.status).toBe(200);
  });
});

// ─── Fade route ───────────────────────────────────────────────────────────────

describe('Fade route — /api/grids/[id]/fade', () => {
  it('PUT extracts id and delegates to updateFade', async () => {
    const { PUT } = await import('@/app/api/grids/[id]/fade/route');
    const { updateFade } = await import('@/controllers/grid');
    const req = makeRequest('PUT');
    const params = makeParams({ id: 'grid-1' });

    const res = await PUT(req, params);
    expect(updateFade).toHaveBeenCalledWith('grid-1', req);
    expect(res.status).toBe(200);
  });
});
