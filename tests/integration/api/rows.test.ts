import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getTestPrisma } from '../../helpers/db';
import {
  createRow,
  updateRow,
  updatePriority,
  deleteRow,
} from '@/controllers/row';

const prisma = getTestPrisma();

function makeRequest(body: unknown, url = 'http://localhost:3000/api/grids/xxx/rows'): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function createSeedUser() {
  return prisma.user.upsert({
    where: { email: 'dev-placeholder@tessitura.local' },
    update: {},
    create: {
      email: 'dev-placeholder@tessitura.local',
      passwordHash: 'not-a-real-hash',
      name: 'Dev User',
      instruments: [],
    },
  });
}

async function createOtherUser() {
  return prisma.user.create({
    data: {
      email: `other-${Date.now()}@example.com`,
      passwordHash: 'hash',
      name: 'Other User',
      instruments: [],
    },
  });
}

async function createGrid(userId: string, name = 'Test Grid') {
  return prisma.practiceGrid.create({
    data: { userId, name },
  });
}

async function createPiece(userId: string, title = 'Test Piece') {
  return prisma.piece.create({
    data: { userId, title },
  });
}

const VALID_ROW = {
  startMeasure: 1,
  endMeasure: 8,
  targetTempo: 120,
  steps: 4,
};

// ─── Error handling ──────────────────────────────────────────────────────────

describe('Row API — Auth failure (placeholder auth, pre-M1.8)', () => {
  // No seed user — exercises AuthenticationError → 401 path
  it('returns 401 when auth fails on createRow', async () => {
    const res = await createRow('00000000-0000-0000-0000-000000000000', makeRequest(VALID_ROW));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when auth fails on updateRow', async () => {
    const res = await updateRow(
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
      makeRequest({ targetTempo: 130 }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when auth fails on updatePriority', async () => {
    const res = await updatePriority(
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
      makeRequest({ priority: 'HIGH' }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when auth fails on deleteRow', async () => {
    const res = await deleteRow(
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });
});

// ─── Create Row ──────────────────────────────────────────────────────────────

describe('Row API — Create', () => {
  beforeEach(createSeedUser);

  it('creates a row without a piece and returns 201', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest(VALID_ROW));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.startMeasure).toBe(1);
    expect(body.endMeasure).toBe(8);
    expect(body.targetTempo).toBe(120);
    expect(body.steps).toBe(4);
    expect(body.piece).toBeNull();
    expect(body.sortOrder).toBe(0);
    expect(body.priority).toBe('MEDIUM');
    expect(body.id).toMatch(/^[0-9a-f]{8}-/);
  });

  it('creates a row with a piece and returns piece data', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const piece = await createPiece(user.id, 'Firebird Suite');

    const res = await createRow(grid.id, makeRequest({ ...VALID_ROW, pieceId: piece.id }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.piece).not.toBeNull();
    expect(body.piece.title).toBe('Firebird Suite');
  });

  it('generates correct number of cells matching steps', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest({ ...VALID_ROW, steps: 5 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.cells).toHaveLength(5);
  });

  it('generates cells with correct tempo percentages for 4 steps', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest(VALID_ROW));
    const body = await res.json();

    // Formula: 0.4 + (0.6 * i / (steps - 1)) for i=0,1,2,3
    const percentages = body.cells.map((c: { targetTempoPercentage: number }) => c.targetTempoPercentage);
    expect(percentages[0]).toBeCloseTo(0.4, 5);
    expect(percentages[1]).toBeCloseTo(0.6, 5);
    expect(percentages[2]).toBeCloseTo(0.8, 5);
    expect(percentages[3]).toBeCloseTo(1.0, 5);
  });

  it('generates a single cell at 100% for 1 step', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest({ ...VALID_ROW, steps: 1 }));
    const body = await res.json();
    expect(body.cells).toHaveLength(1);
    expect(body.cells[0].targetTempoPercentage).toBe(1.0);
  });

  it('auto-assigns incrementing sortOrder', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res1 = await createRow(grid.id, makeRequest(VALID_ROW));
    const res2 = await createRow(grid.id, makeRequest({ ...VALID_ROW, startMeasure: 9, endMeasure: 16 }));

    const body1 = await res1.json();
    const body2 = await res2.json();
    expect(body1.sortOrder).toBe(0);
    expect(body2.sortOrder).toBe(1);
  });

  it('returns 400 for invalid JSON body', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const req = new NextRequest('http://localhost:3000/api/grids/xxx/rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await createRow(grid.id, req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-string pieceId on create', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest({ ...VALID_ROW, pieceId: 123 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for non-string passageLabel on create', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest({ ...VALID_ROW, passageLabel: 999 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when missing required numeric fields', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest({ startMeasure: 1 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when startMeasure is not a positive integer', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest({ ...VALID_ROW, startMeasure: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when endMeasure < startMeasure', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest({ ...VALID_ROW, startMeasure: 10, endMeasure: 5 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when steps is not a number', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest({ ...VALID_ROW, steps: 'five' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-existent pieceId', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(
      grid.id,
      makeRequest({ ...VALID_ROW, pieceId: '00000000-0000-0000-0000-000000000099' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for soft-deleted pieceId', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const piece = await prisma.piece.create({
      data: { userId: user.id, title: 'Deleted Piece', deletedAt: new Date() },
    });

    const res = await createRow(grid.id, makeRequest({ ...VALID_ROW, pieceId: piece.id }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for pieceId owned by another user', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const other = await createOtherUser();
    const grid = await createGrid(user.id);
    const piece = await createPiece(other.id, 'Not Mine');

    const res = await createRow(grid.id, makeRequest({ ...VALID_ROW, pieceId: piece.id }));
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent grid', async () => {
    const res = await createRow(
      '00000000-0000-0000-0000-000000000000',
      makeRequest(VALID_ROW),
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 for grid owned by different user', async () => {
    const other = await createOtherUser();
    const grid = await createGrid(other.id);

    const res = await createRow(grid.id, makeRequest(VALID_ROW));
    expect(res.status).toBe(404);
  });

  it('returns 400 for malformed grid UUID', async () => {
    const res = await createRow('not-a-uuid', makeRequest(VALID_ROW));
    expect(res.status).toBe(400);
  });

  it('response has no internal fields (practiceGridId, pieceId, deletedAt)', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest(VALID_ROW));
    const body = await res.json();
    expect(body).not.toHaveProperty('practiceGridId');
    expect(body).not.toHaveProperty('pieceId');
    expect(body).not.toHaveProperty('deletedAt');
  });

  it('cells have targetTempoBpm computed from percentage and targetTempo', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest({ ...VALID_ROW, targetTempo: 100, steps: 2 }));
    const body = await res.json();
    // step 0: 0.4 * 100 = 40, step 1: 1.0 * 100 = 100
    expect(body.cells[0].targetTempoBpm).toBe(40);
    expect(body.cells[1].targetTempoBpm).toBe(100);
  });

  it('touches parent grid updatedAt', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const gridBefore = await prisma.practiceGrid.findUniqueOrThrow({ where: { id: grid.id } });

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 50));

    await createRow(grid.id, makeRequest(VALID_ROW));

    const gridAfter = await prisma.practiceGrid.findUniqueOrThrow({ where: { id: grid.id } });
    expect(gridAfter.updatedAt.getTime()).toBeGreaterThan(gridBefore.updatedAt.getTime());
  });

  it('returns 400 for empty request body', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(grid.id, makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('accepts passageLabel on creation', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await createRow(
      grid.id,
      makeRequest({ ...VALID_ROW, passageLabel: 'Intro section' }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.passageLabel).toBe('Intro section');
  });
});

// ─── Edit Row ────────────────────────────────────────────────────────────────

describe('Row API — Edit', () => {
  beforeEach(createSeedUser);

  it('partial update changes only specified fields', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const res = await updateRow(grid.id, created.id, makeRequest({ targetTempo: 140 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.targetTempo).toBe(140);
    expect(body.startMeasure).toBe(1); // unchanged
    expect(body.endMeasure).toBe(8);   // unchanged
    expect(body.steps).toBe(4);        // unchanged
  });

  it('tempo change does NOT regenerate cells', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();
    const originalCellIds = created.cells.map((c: { id: string }) => c.id);

    const res = await updateRow(grid.id, created.id, makeRequest({ targetTempo: 200 }));
    const body = await res.json();
    const updatedCellIds = body.cells.map((c: { id: string }) => c.id);

    expect(updatedCellIds).toEqual(originalCellIds);
  });

  it('step count change regenerates cells and soft-deletes old ones', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();
    const originalCellIds = created.cells.map((c: { id: string }) => c.id);

    const res = await updateRow(grid.id, created.id, makeRequest({ steps: 6 }));
    expect(res.status).toBe(200);
    const body = await res.json();

    // New cells should be different
    expect(body.cells).toHaveLength(6);
    const newCellIds = body.cells.map((c: { id: string }) => c.id);
    expect(newCellIds).not.toEqual(expect.arrayContaining(originalCellIds));

    // Old cells should be soft-deleted in the DB
    for (const oldId of originalCellIds) {
      const cell = await prisma.practiceCell.findUnique({ where: { id: oldId } });
      expect(cell!.deletedAt).not.toBeNull();
    }
  });

  it('step count change soft-deletes old completions', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    // Add a completion to the first cell
    const completion = await prisma.practiceCellCompletion.create({
      data: {
        practiceCellId: created.cells[0].id,
        completionDate: new Date('2026-03-15'),
      },
    });

    // Change steps
    await updateRow(grid.id, created.id, makeRequest({ steps: 2 }));

    // Completion should be soft-deleted
    const deletedCompletion = await prisma.practiceCellCompletion.findUnique({
      where: { id: completion.id },
    });
    expect(deletedCompletion!.deletedAt).not.toBeNull();
  });

  it('pieceId can be changed to a valid piece', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const piece = await createPiece(user.id, 'New Piece');
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const res = await updateRow(grid.id, created.id, makeRequest({ pieceId: piece.id }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.piece).not.toBeNull();
    expect(body.piece.title).toBe('New Piece');
  });

  it('pieceId can be set to null', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const piece = await createPiece(user.id, 'Old Piece');
    const createRes = await createRow(grid.id, makeRequest({ ...VALID_ROW, pieceId: piece.id }));
    const created = await createRes.json();
    expect(created.piece).not.toBeNull();

    const res = await updateRow(grid.id, created.id, makeRequest({ pieceId: null }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.piece).toBeNull();
  });

  it('returns 404 for non-existent row', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await updateRow(
      grid.id,
      '00000000-0000-0000-0000-000000000099',
      makeRequest({ targetTempo: 140 }),
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 for row on grid owned by different user', async () => {
    const other = await createOtherUser();
    const grid = await createGrid(other.id);
    const row = await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 120,
        steps: 1,
      },
    });

    const res = await updateRow(grid.id, row.id, makeRequest({ targetTempo: 140 }));
    expect(res.status).toBe(404);
  });

  it('returns 400 for malformed row UUID', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(seedUser.id);

    const res = await updateRow(grid.id, 'bad-uuid', makeRequest({ targetTempo: 140 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed grid UUID', async () => {
    const res = await updateRow(
      'bad-uuid',
      '00000000-0000-0000-0000-000000000001',
      makeRequest({ targetTempo: 140 }),
    );
    expect(res.status).toBe(400);
  });

  it('touches parent grid updatedAt', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const gridBefore = await prisma.practiceGrid.findUniqueOrThrow({ where: { id: grid.id } });
    await new Promise((r) => setTimeout(r, 50));

    await updateRow(grid.id, created.id, makeRequest({ targetTempo: 140 }));

    const gridAfter = await prisma.practiceGrid.findUniqueOrThrow({ where: { id: grid.id } });
    expect(gridAfter.updatedAt.getTime()).toBeGreaterThan(gridBefore.updatedAt.getTime());
  });

  it('updates passageLabel', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const res = await updateRow(grid.id, created.id, makeRequest({ passageLabel: 'Letter C' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.passageLabel).toBe('Letter C');
  });

  it('returns 400 for non-string pieceId on update', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const res = await updateRow(grid.id, created.id, makeRequest({ pieceId: 123 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for non-string passageLabel on update', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const res = await updateRow(grid.id, created.id, makeRequest({ passageLabel: 999 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when updating endMeasure below existing startMeasure', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    // Create row with startMeasure=5, endMeasure=10
    const createRes = await createRow(
      grid.id,
      makeRequest({ ...VALID_ROW, startMeasure: 5, endMeasure: 10 }),
    );
    const created = await createRes.json();

    // Update only endMeasure to be below existing startMeasure (5)
    const res = await updateRow(grid.id, created.id, makeRequest({ endMeasure: 3 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when updating startMeasure above existing endMeasure', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    // Create row with startMeasure=1, endMeasure=8
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    // Update only startMeasure to be above existing endMeasure (8)
    const res = await updateRow(grid.id, created.id, makeRequest({ startMeasure: 12 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for empty request body on update', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const req = new NextRequest('http://localhost:3000/api/grids/xxx/rows', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });

    const res = await updateRow(grid.id, '00000000-0000-0000-0000-000000000001', req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-number targetTempo', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const res = await updateRow(grid.id, created.id, makeRequest({ targetTempo: 'fast' }));
    expect(res.status).toBe(400);
  });
});

// ─── Priority ────────────────────────────────────────────────────────────────

describe('Row API — Priority', () => {
  beforeEach(createSeedUser);

  it('sets priority and returns full row', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const res = await updatePriority(grid.id, created.id, makeRequest({ priority: 'HIGH' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.priority).toBe('HIGH');
    expect(body.cells).toBeDefined();
    expect(body.id).toBe(created.id);
  });

  it('changes priority from one valid value to another', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    await updatePriority(grid.id, created.id, makeRequest({ priority: 'CRITICAL' }));
    const res = await updatePriority(grid.id, created.id, makeRequest({ priority: 'LOW' }));
    const body = await res.json();
    expect(body.priority).toBe('LOW');
  });

  it('rejects invalid priority value', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const res = await updatePriority(grid.id, created.id, makeRequest({ priority: 'URGENT' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing priority', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const res = await updatePriority(grid.id, created.id, makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('does not affect cells or completions', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();
    const originalCellIds = created.cells.map((c: { id: string }) => c.id);

    const res = await updatePriority(grid.id, created.id, makeRequest({ priority: 'CRITICAL' }));
    const body = await res.json();
    const updatedCellIds = body.cells.map((c: { id: string }) => c.id);

    expect(updatedCellIds).toEqual(originalCellIds);
  });

  it('touches parent grid updatedAt', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const gridBefore = await prisma.practiceGrid.findUniqueOrThrow({ where: { id: grid.id } });
    await new Promise((r) => setTimeout(r, 50));

    await updatePriority(grid.id, created.id, makeRequest({ priority: 'HIGH' }));

    const gridAfter = await prisma.practiceGrid.findUniqueOrThrow({ where: { id: grid.id } });
    expect(gridAfter.updatedAt.getTime()).toBeGreaterThan(gridBefore.updatedAt.getTime());
  });

  it('returns 404 for non-existent row', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await updatePriority(
      grid.id,
      '00000000-0000-0000-0000-000000000099',
      makeRequest({ priority: 'HIGH' }),
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for malformed UUID', async () => {
    const res = await updatePriority('bad-uuid', 'bad-uuid', makeRequest({ priority: 'HIGH' }));
    expect(res.status).toBe(400);
  });
});

// ─── Delete Row ──────────────────────────────────────────────────────────────

describe('Row API — Delete', () => {
  beforeEach(createSeedUser);

  it('returns 204 and soft-deletes the row', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const res = await deleteRow(grid.id, created.id);
    expect(res.status).toBe(204);

    const deleted = await prisma.practiceRow.findUnique({ where: { id: created.id } });
    expect(deleted!.deletedAt).not.toBeNull();
  });

  it('cascade soft-deletes cells', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();
    const cellIds = created.cells.map((c: { id: string }) => c.id);

    await deleteRow(grid.id, created.id);

    for (const cellId of cellIds) {
      const cell = await prisma.practiceCell.findUnique({ where: { id: cellId } });
      expect(cell!.deletedAt).not.toBeNull();
    }
  });

  it('cascade soft-deletes completions', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    // Add completions
    const completion = await prisma.practiceCellCompletion.create({
      data: {
        practiceCellId: created.cells[0].id,
        completionDate: new Date('2026-03-15'),
      },
    });

    await deleteRow(grid.id, created.id);

    const deletedCompletion = await prisma.practiceCellCompletion.findUnique({
      where: { id: completion.id },
    });
    expect(deletedCompletion!.deletedAt).not.toBeNull();
  });

  it('returns 404 for non-existent row', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);

    const res = await deleteRow(grid.id, '00000000-0000-0000-0000-000000000099');
    expect(res.status).toBe(404);
  });

  it('returns 404 for row on grid owned by different user', async () => {
    const other = await createOtherUser();
    const otherGrid = await createGrid(other.id);
    const row = await prisma.practiceRow.create({
      data: {
        practiceGridId: otherGrid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 120,
        steps: 1,
      },
    });

    const res = await deleteRow(otherGrid.id, row.id);
    expect(res.status).toBe(404);
  });

  it('returns 404 for already-deleted row', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    // Delete once
    const first = await deleteRow(grid.id, created.id);
    expect(first.status).toBe(204);

    // Delete again — should be 404
    const second = await deleteRow(grid.id, created.id);
    expect(second.status).toBe(404);
  });

  it('returns 400 for malformed UUID', async () => {
    const res = await deleteRow('bad-uuid', 'bad-uuid');
    expect(res.status).toBe(400);
  });

  it('touches parent grid updatedAt', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    const gridBefore = await prisma.practiceGrid.findUniqueOrThrow({ where: { id: grid.id } });
    await new Promise((r) => setTimeout(r, 50));

    await deleteRow(grid.id, created.id);

    const gridAfter = await prisma.practiceGrid.findUniqueOrThrow({ where: { id: grid.id } });
    expect(gridAfter.updatedAt.getTime()).toBeGreaterThan(gridBefore.updatedAt.getTime());
  });

  it('deleted row no longer appears in grid detail', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await createGrid(user.id);
    const createRes = await createRow(grid.id, makeRequest(VALID_ROW));
    const created = await createRes.json();

    await deleteRow(grid.id, created.id);

    const { getGrid } = await import('@/controllers/grid');
    const res = await getGrid(grid.id);
    const body = await res.json();
    expect(body.rows).toHaveLength(0);
  });
});

// ─── Cross-cutting ───────────────────────────────────────────────────────────

describe('Row API — Cross-cutting', () => {
  beforeEach(createSeedUser);

  it('cross-user isolation: cannot create row on another user\'s grid', async () => {
    const other = await createOtherUser();
    const grid = await createGrid(other.id);

    const res = await createRow(grid.id, makeRequest(VALID_ROW));
    expect(res.status).toBe(404);
  });

  it('cross-user isolation: cannot update row on another user\'s grid', async () => {
    const other = await createOtherUser();
    const grid = await createGrid(other.id);
    const row = await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 120,
        steps: 1,
      },
    });

    const res = await updateRow(grid.id, row.id, makeRequest({ targetTempo: 140 }));
    expect(res.status).toBe(404);
  });

  it('cross-user isolation: cannot delete row on another user\'s grid', async () => {
    const other = await createOtherUser();
    const grid = await createGrid(other.id);
    const row = await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 120,
        steps: 1,
      },
    });

    const res = await deleteRow(grid.id, row.id);
    expect(res.status).toBe(404);
  });

  it('cross-user isolation: cannot set priority on another user\'s row', async () => {
    const other = await createOtherUser();
    const grid = await createGrid(other.id);
    const row = await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 120,
        steps: 1,
      },
    });

    const res = await updatePriority(grid.id, row.id, makeRequest({ priority: 'HIGH' }));
    expect(res.status).toBe(404);
  });
});
