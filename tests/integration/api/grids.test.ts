import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getTestPrisma } from '../../helpers/db';
import {
  createGrid,
  listGrids,
  getGrid,
  deleteGrid,
} from '@/controllers/grid';
import { completeCell } from '@/controllers/cell';

const prisma = getTestPrisma();

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/grids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeListRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/grids');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url);
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

// ─── Error handling ──────────────────────────────────────────────────────────

describe('Grid API — Auth failure (placeholder auth, pre-M1.8)', () => {
  // No seed user created — exercises the AuthenticationError → 401 path
  it('returns 401 when auth fails on createGrid', async () => {
    const res = await createGrid(makeRequest({ name: 'Grid' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when auth fails on listGrids', async () => {
    const res = await listGrids(makeListRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when auth fails on getGrid', async () => {
    const res = await getGrid('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when auth fails on deleteGrid', async () => {
    const res = await deleteGrid('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });
});

// ─── Task 9: Create Grid (tests 18–26) ────────────────────────────────────────

describe('Grid API — Create', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  // Test 18
  it('POST with valid name returns 201 with correct userId and defaults', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });

    const res = await createGrid(makeRequest({ name: 'My Grid' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('My Grid');
    expect(body.fadeEnabled).toBe(true);

    // Verify userId at the database level (view strips it from response)
    const created = await prisma.practiceGrid.findUniqueOrThrow({ where: { id: body.id } });
    expect(created.userId).toBe(seedUser.id);
  });

  // Test 19
  it('POST with name and notes returns 201', async () => {
    const res = await createGrid(makeRequest({ name: 'Grid', notes: 'My notes' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Grid');
    expect(body.notes).toBe('My notes');
  });

  // Test 20
  it('POST with empty body returns 400 with error shape', async () => {
    const req = new NextRequest('http://localhost:3000/api/grids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const res = await createGrid(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.message).toBeDefined();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // Test 21
  it('POST with empty string name returns 400', async () => {
    const res = await createGrid(makeRequest({ name: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // Test 22
  it('POST with whitespace-only name returns 400', async () => {
    const res = await createGrid(makeRequest({ name: '   ' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // Test 23
  it('POST with name over 200 chars returns 400', async () => {
    const res = await createGrid(makeRequest({ name: 'a'.repeat(201) }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // Test 24
  it('POST returns grid with UUID id and timestamps', async () => {
    const res = await createGrid(makeRequest({ name: 'UUID Test' }));
    const body = await res.json();
    expect(body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  // Test 25
  it('POST with HTML in name stores and returns it unchanged', async () => {
    const htmlName = "<script>alert('xss')</script>";
    const res = await createGrid(makeRequest({ name: htmlName }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe(htmlName);
  });

  // Test 25a
  it('POST with non-string notes returns 400', async () => {
    const res = await createGrid(makeRequest({ name: 'Grid', notes: 123 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // Test 26
  it('POST with HTML in notes stores and returns it unchanged', async () => {
    const res = await createGrid(
      makeRequest({ name: 'Grid', notes: '<b>bold</b>' }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.notes).toBe('<b>bold</b>');
  });
});

// ─── Task 10: List Grids (tests 27–31) ───────────────────────────────────────

describe('Grid API — List', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  // Test 27
  it('GET returns 200 with empty array when user has no grids', async () => {
    const res = await listGrids(makeListRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  // Test 28
  it('GET returns only grids belonging to the current user', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const otherUser = await createOtherUser();

    await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'My Grid' },
    });
    await prisma.practiceGrid.create({
      data: { userId: otherUser.id, name: 'Other Grid' },
    });

    const res = await listGrids(makeListRequest());
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('My Grid');
  });

  // Test 29
  it('GET excludes soft-deleted grids', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });

    await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Active Grid' },
    });
    await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Deleted Grid', deletedAt: new Date() },
    });

    const res = await listGrids(makeListRequest());
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Active Grid');
  });

  // Test 30
  it('GET returns grids sorted by updatedAt descending', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });

    // Create 3 grids with explicit timestamps to avoid timing dependencies
    const now = new Date();
    await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'First', updatedAt: new Date(now.getTime() - 3000) },
    });
    const grid2 = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Second', updatedAt: new Date(now.getTime() - 2000) },
    });
    await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Third', updatedAt: new Date(now.getTime() - 1000) },
    });
    // Update middle grid to make it most recent
    await prisma.practiceGrid.update({
      where: { id: grid2.id },
      data: { notes: 'updated', updatedAt: now },
    });

    const res = await listGrids(makeListRequest());
    const body = await res.json();
    expect(body).toHaveLength(3);
    expect(body[0].name).toBe('Second'); // most recently updated
    expect(body[1].name).toBe('Third');  // created last, never updated
    expect(body[2].name).toBe('First');  // created first, never updated
  });

  // Test 31
  it('GET response has no deletedAt or userId', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Format Test' },
    });

    const res = await listGrids(makeListRequest());
    const body = await res.json();
    expect(body[0]).not.toHaveProperty('deletedAt');
    expect(body[0]).not.toHaveProperty('userId');
  });
});

// ─── List with detail=true ────────────────────────────────────────────────────

describe('Grid API — List with detail', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('GET ?detail=true returns grids with completionPercentage and freshnessSummary', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Detail Grid' },
    });
    const row = await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 120,
        steps: 2,
      },
    });
    await prisma.practiceCell.createMany({
      data: [
        { practiceRowId: row.id, stepNumber: 0, targetTempoPercentage: 0.5 },
        { practiceRowId: row.id, stepNumber: 1, targetTempoPercentage: 1.0 },
      ],
    });
    const cells = await prisma.practiceCell.findMany({
      where: { practiceRowId: row.id },
      orderBy: { stepNumber: 'asc' },
    });
    await prisma.practiceCellCompletion.create({
      data: { practiceCellId: cells[0].id, completionDate: new Date() },
    });

    const res = await listGrids(makeListRequest({ detail: 'true' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toHaveProperty('completionPercentage');
    expect(body[0]).toHaveProperty('freshnessSummary');
    expect(body[0].freshnessSummary).toHaveProperty('fresh');
    expect(body[0].freshnessSummary).toHaveProperty('incomplete');
  });

  it('GET ?detail=true returns rows without cells', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    await prisma.practiceGrid.create({
      data: {
        userId: seedUser.id,
        name: 'Row Shape Grid',
        practiceRows: {
          create: {
            sortOrder: 0,
            startMeasure: 1,
            endMeasure: 4,
            targetTempo: 100,
            steps: 1,
          },
        },
      },
    });

    const res = await listGrids(makeListRequest({ detail: 'true' }));
    const body = await res.json();
    const row = body[0].rows[0];
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('completionPercentage');
    expect(row).toHaveProperty('freshnessSummary');
    expect(row).not.toHaveProperty('cells');
    expect(row).not.toHaveProperty('sortOrder');
    expect(row).not.toHaveProperty('targetTempo');
  });

  it('GET ?detail=true excludes soft-deleted grids', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Active' },
    });
    await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Deleted', deletedAt: new Date() },
    });

    const res = await listGrids(makeListRequest({ detail: 'true' }));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Active');
  });

  it('GET without detail param returns lightweight response (no completionPercentage)', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Lightweight' },
    });

    const res = await listGrids(makeListRequest());
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Lightweight');
    expect(body[0]).not.toHaveProperty('completionPercentage');
    expect(body[0]).not.toHaveProperty('freshnessSummary');
    expect(body[0]).not.toHaveProperty('rows');
  });
});

// ─── Task 11: Get Grid Detail (tests 32–39) ───────────────────────────────────

describe('Grid API — Detail', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  // Test 32
  it('GET /grids/[id] returns full nested structure', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Detail Grid' },
    });
    const row = await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 120,
        steps: 2,
      },
    });
    const cell = await prisma.practiceCell.create({
      data: {
        practiceRowId: row.id,
        stepNumber: 0,
        targetTempoPercentage: 0.4,
      },
    });
    await prisma.practiceCellCompletion.create({
      data: {
        practiceCellId: cell.id,
        completionDate: new Date('2026-03-15'),
      },
    });

    const res = await getGrid(grid.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].cells).toHaveLength(1);
    expect(body.rows[0].cells[0].completions).toHaveLength(1);
  });

  // Test 33
  it('GET /grids/[id] returns rows sorted by sortOrder ascending', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Sort Grid' },
    });
    await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 2,
        startMeasure: 9,
        endMeasure: 16,
        targetTempo: 100,
        steps: 1,
      },
    });
    await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 120,
        steps: 1,
      },
    });

    const res = await getGrid(grid.id);
    const body = await res.json();
    expect(body.rows[0].sortOrder).toBe(0);
    expect(body.rows[1].sortOrder).toBe(2);
  });

  // Test 34
  it('GET /grids/[id] returns cells sorted by stepNumber ascending', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Cell Sort' },
    });
    const row = await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 120,
        steps: 3,
      },
    });
    // Create cells out of order
    await prisma.practiceCell.create({
      data: { practiceRowId: row.id, stepNumber: 2, targetTempoPercentage: 1.0 },
    });
    await prisma.practiceCell.create({
      data: { practiceRowId: row.id, stepNumber: 0, targetTempoPercentage: 0.4 },
    });

    const res = await getGrid(grid.id);
    const body = await res.json();
    expect(body.rows[0].cells[0].stepNumber).toBe(0);
    expect(body.rows[0].cells[1].stepNumber).toBe(2);
  });

  // Test 35
  it('GET /grids/[id] returns completions sorted by completionDate ascending', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Comp Sort' },
    });
    const row = await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 4,
        targetTempo: 100,
        steps: 1,
      },
    });
    const cell = await prisma.practiceCell.create({
      data: { practiceRowId: row.id, stepNumber: 0, targetTempoPercentage: 0.4 },
    });
    // Create completions out of order
    await prisma.practiceCellCompletion.create({
      data: { practiceCellId: cell.id, completionDate: new Date('2026-03-16') },
    });
    await prisma.practiceCellCompletion.create({
      data: { practiceCellId: cell.id, completionDate: new Date('2026-03-14') },
    });

    const res = await getGrid(grid.id);
    const body = await res.json();
    const dates = body.rows[0].cells[0].completions.map(
      (c: { completionDate: string }) => c.completionDate,
    );
    expect(new Date(dates[0]).getTime()).toBeLessThan(new Date(dates[1]).getTime());
  });

  // Test 36
  it('GET /grids/[id] returns 404 for non-existent ID', async () => {
    const res = await getGrid('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  // Test 37
  it('GET /grids/[id] returns 404 for grid owned by different user', async () => {
    const otherUser = await createOtherUser();
    const grid = await prisma.practiceGrid.create({
      data: { userId: otherUser.id, name: 'Not Mine' },
    });

    const res = await getGrid(grid.id);
    expect(res.status).toBe(404);
  });

  // Test 38
  it('GET /grids/[id] returns 404 for soft-deleted grid', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Deleted', deletedAt: new Date() },
    });

    const res = await getGrid(grid.id);
    expect(res.status).toBe(404);
  });

  // Test 39
  it('GET /grids/[id] returns 400 for malformed UUID', async () => {
    const res = await getGrid('not-a-uuid');
    expect(res.status).toBe(400);
  });

  it('GET /grids/[id] excludes soft-deleted rows from detail', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Soft Delete Test' },
    });
    await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 120,
        steps: 1,
      },
    });
    await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 1,
        startMeasure: 9,
        endMeasure: 16,
        targetTempo: 120,
        steps: 1,
        deletedAt: new Date(),
      },
    });

    const res = await getGrid(grid.id);
    const body = await res.json();
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].sortOrder).toBe(0);
  });

  it('GET /grids/[id] returns piece: null on rows without a piece', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Piece Null Test' },
    });
    await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 120,
        steps: 1,
      },
    });

    const res = await getGrid(grid.id);
    const body = await res.json();
    expect(body.rows[0].piece).toBeNull();
  });
});

// ─── Task 12: Delete Grid (tests 40–46) ──────────────────────────────────────

describe('Grid API — Delete', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  // Test 40
  it('DELETE returns 204 and sets deletedAt', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'To Delete' },
    });

    const res = await deleteGrid(grid.id);
    expect(res.status).toBe(204);

    // Verify via raw query (raw client sees deleted records)
    const deleted = await prisma.practiceGrid.findUnique({
      where: { id: grid.id },
    });
    expect(deleted!.deletedAt).not.toBeNull();
  });

  // Test 41
  it('DELETE cascades to child rows, cells, and completions', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Cascade Grid' },
    });
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
    const cell = await prisma.practiceCell.create({
      data: { practiceRowId: row.id, stepNumber: 0, targetTempoPercentage: 0.4 },
    });
    const completion = await prisma.practiceCellCompletion.create({
      data: { practiceCellId: cell.id, completionDate: new Date('2026-03-15') },
    });

    await deleteGrid(grid.id);

    // All children should have deletedAt set (raw client can see them)
    const deletedRow = await prisma.practiceRow.findUnique({ where: { id: row.id } });
    const deletedCell = await prisma.practiceCell.findUnique({ where: { id: cell.id } });
    const deletedCompletion = await prisma.practiceCellCompletion.findUnique({
      where: { id: completion.id },
    });

    expect(deletedRow!.deletedAt).not.toBeNull();
    expect(deletedCell!.deletedAt).not.toBeNull();
    expect(deletedCompletion!.deletedAt).not.toBeNull();
  });

  // Test 42
  it('DELETE returns 404 for non-existent grid', async () => {
    const res = await deleteGrid('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  // Test 43
  it('DELETE returns 404 for grid owned by different user', async () => {
    const otherUser = await createOtherUser();
    const grid = await prisma.practiceGrid.create({
      data: { userId: otherUser.id, name: 'Not Mine' },
    });

    const res = await deleteGrid(grid.id);
    expect(res.status).toBe(404);
  });

  // Test 44
  it('DELETE returns 404 for already-deleted grid', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Already Gone', deletedAt: new Date() },
    });

    const res = await deleteGrid(grid.id);
    expect(res.status).toBe(404);
  });

  // Test 45
  it('DELETE returns 400 for malformed UUID', async () => {
    const res = await deleteGrid('not-a-uuid');
    expect(res.status).toBe(400);
  });

  // Test 46
  it('deleted grid no longer appears in list', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Will Vanish' },
    });

    // Verify it appears first
    const beforeRes = await listGrids(makeListRequest());
    const beforeBody = await beforeRes.json();
    expect(beforeBody).toHaveLength(1);

    // Delete it
    await deleteGrid(grid.id);

    // Verify it's gone
    const afterRes = await listGrids(makeListRequest());
    const afterBody = await afterRes.json();
    expect(afterBody).toHaveLength(0);
  });
});

// ─── Grid Detail — Freshness Fields ─────────────────────────────────────────

describe('Grid API — Detail Freshness Fields', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  async function createGridWithCells(userId: string, steps: number) {
    const grid = await prisma.practiceGrid.create({
      data: { userId, name: 'Freshness Grid', fadeEnabled: true },
    });
    const row = await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        startMeasure: 1,
        endMeasure: 4,
        targetTempo: 120,
        steps,
      },
    });
    const percentages = Array.from({ length: steps }, (_, i) =>
      steps === 1 ? 1.0 : 0.4 + (0.6 * i) / (steps - 1),
    );
    await prisma.practiceCell.createMany({
      data: percentages.map((p, i) => ({
        practiceRowId: row.id,
        stepNumber: i,
        targetTempoPercentage: p,
      })),
    });
    const cells = await prisma.practiceCell.findMany({
      where: { practiceRowId: row.id },
      orderBy: { stepNumber: 'asc' },
    });
    return { grid, row, cells };
  }

  it('grid detail includes completionPercentage and freshnessSummary', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 3);

    // Complete 1 of 3 cells
    await completeCell(grid.id, row.id, cells[0].id);

    const res = await getGrid(grid.id);
    const body = await res.json();

    expect(body).toHaveProperty('completionPercentage');
    expect(body).toHaveProperty('freshnessSummary');
    expect(typeof body.completionPercentage).toBe('number');
    expect(body.freshnessSummary).toHaveProperty('fresh');
    expect(body.freshnessSummary).toHaveProperty('aging');
    expect(body.freshnessSummary).toHaveProperty('stale');
    expect(body.freshnessSummary).toHaveProperty('decayed');
    expect(body.freshnessSummary).toHaveProperty('incomplete');

    // 1 fresh, 2 incomplete → completionPercentage = 1/3 * 100
    // With fade ON: fresh+aging+stale count → 1/3 * 100
    expect(body.freshnessSummary.fresh).toBe(1);
    expect(body.freshnessSummary.incomplete).toBe(2);
    expect(body.completionPercentage).toBeCloseTo(100 / 3, 1);
  });

  it('row-level completionPercentage and freshnessSummary in grid detail', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 2);

    // Complete 1 of 2 cells
    await completeCell(grid.id, row.id, cells[0].id);

    const res = await getGrid(grid.id);
    const body = await res.json();

    const rowData = body.rows[0];
    expect(rowData).toHaveProperty('completionPercentage');
    expect(rowData).toHaveProperty('freshnessSummary');
    expect(rowData.completionPercentage).toBe(50);
    expect(rowData.freshnessSummary.fresh).toBe(1);
    expect(rowData.freshnessSummary.incomplete).toBe(1);
  });

  it('cell response includes freshnessState, lastCompletionDate, isShielded', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    // Before completion: incomplete
    const beforeRes = await getGrid(grid.id);
    const beforeBody = await beforeRes.json();
    const beforeCell = beforeBody.rows[0].cells[0];
    expect(beforeCell.freshnessState).toBe('incomplete');
    expect(beforeCell.lastCompletionDate).toBeNull();
    expect(beforeCell.isShielded).toBe(false);

    // After completion: fresh
    await completeCell(grid.id, row.id, cells[0].id);
    const afterRes = await getGrid(grid.id);
    const afterBody = await afterRes.json();
    const afterCell = afterBody.rows[0].cells[0];
    expect(afterCell.freshnessState).toBe('fresh');
    expect(afterCell.lastCompletionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof afterCell.isShielded).toBe('boolean');
  });
});
