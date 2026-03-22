import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getTestPrisma } from '../../helpers/db';
import {
  completeCell,
  undoCompletion,
  resetCell,
} from '@/controllers/cell';
import { updateFade, getGrid } from '@/controllers/grid';

const prisma = getTestPrisma();

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

async function createGridWithCells(userId: string, steps = 5) {
  const grid = await prisma.practiceGrid.create({
    data: { userId, name: 'Test Grid', fadeEnabled: true },
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

// ─── Auth failure tests ──────────────────────────────────────────────────────

describe('Cell API — Auth failure (placeholder auth, pre-M1.8)', () => {
  const validId = '00000000-0000-0000-0000-000000000000';

  it('returns 401 when auth fails on completeCell', async () => {
    const res = await completeCell(validId, validId, validId);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when auth fails on undoCompletion', async () => {
    const res = await undoCompletion(validId, validId, validId);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when auth fails on resetCell', async () => {
    const res = await resetCell(validId, validId, validId);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });
});

// ─── Validation tests ─────────────────────────────────────────────────────────

describe('Cell API — Validation', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('returns 400 for malformed grid ID on completeCell', async () => {
    const res = await completeCell('not-a-uuid', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for malformed row ID on undoCompletion', async () => {
    const res = await undoCompletion('00000000-0000-0000-0000-000000000000', 'bad', '00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for malformed cell ID on resetCell', async () => {
    const res = await resetCell('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'bad');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ─── Complete Cell ────────────────────────────────────────────────────────────

describe('Cell API — Complete', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('returns 201 and creates a completion with freshnessState=fresh, interval=1', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);
    const cell = cells[0];

    const res = await completeCell(grid.id, row.id, cell.id);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.id).toBe(cell.id);
    expect(body.freshnessState).toBe('fresh');
    expect(body.freshnessIntervalDays).toBe(1);
    expect(body.completions).toHaveLength(1);
    expect(body.lastCompletionDate).toBeDefined();
  });

  it('returns 409 when completing same cell same day', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    const first = await completeCell(grid.id, row.id, cells[0].id);
    expect(first.status).toBe(201);

    const second = await completeCell(grid.id, row.id, cells[0].id);
    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.error.code).toBe('CONFLICT');
  });

  it('returns 404 for non-existent cell', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row } = await createGridWithCells(user.id, 1);

    const res = await completeCell(grid.id, row.id, '00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent row', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, cells } = await createGridWithCells(user.id, 1);

    const res = await completeCell(grid.id, '00000000-0000-0000-0000-000000000000', cells[0].id);
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent grid', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { row, cells } = await createGridWithCells(user.id, 1);

    const res = await completeCell('00000000-0000-0000-0000-000000000000', row.id, cells[0].id);
    expect(res.status).toBe(404);
  });

  it('returns 404 for grid owned by different user', async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: `other-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Other',
        instruments: [],
      },
    });
    const { grid, row, cells } = await createGridWithCells(otherUser.id, 1);

    // Seed user (auth placeholder) tries to access other user's grid
    const res = await completeCell(grid.id, row.id, cells[0].id);
    expect(res.status).toBe(404);
  });

  it('response includes targetTempoBpm computed from percentage and row tempo', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    const res = await completeCell(grid.id, row.id, cells[0].id);
    const body = await res.json();
    // 1.0 * 120 = 120
    expect(body.targetTempoBpm).toBe(120);
  });
});

// ─── Undo Completion ──────────────────────────────────────────────────────────

describe('Cell API — Undo', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('returns 200 and soft-deletes most recent completion', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    await completeCell(grid.id, row.id, cells[0].id);
    const res = await undoCompletion(grid.id, row.id, cells[0].id);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.completions).toHaveLength(0);
  });

  it('returns 409 when no completions to undo', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    const res = await undoCompletion(grid.id, row.id, cells[0].id);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('CONFLICT');
  });

  it('resets interval to 1 when no completions remain', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    await completeCell(grid.id, row.id, cells[0].id);
    const res = await undoCompletion(grid.id, row.id, cells[0].id);
    const body = await res.json();
    expect(body.freshnessIntervalDays).toBe(1);
  });

  it('undo then re-complete same day returns 201 (un-soft-deletes)', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    // Complete
    const first = await completeCell(grid.id, row.id, cells[0].id);
    expect(first.status).toBe(201);

    // Undo
    const undo = await undoCompletion(grid.id, row.id, cells[0].id);
    expect(undo.status).toBe(200);

    // Re-complete (should un-soft-delete, not conflict)
    const second = await completeCell(grid.id, row.id, cells[0].id);
    expect(second.status).toBe(201);

    const body = await second.json();
    expect(body.completions).toHaveLength(1);
  });

  it('returns 404 for non-existent cell', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row } = await createGridWithCells(user.id, 1);

    const res = await undoCompletion(grid.id, row.id, '00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

// ─── Reset Cell ───────────────────────────────────────────────────────────────

describe('Cell API — Reset', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('returns 200 and sets interval to 1', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    // Complete to create a completion and potentially bump interval
    await completeCell(grid.id, row.id, cells[0].id);

    const res = await resetCell(grid.id, row.id, cells[0].id);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.freshnessIntervalDays).toBe(1);
  });

  it('returns 409 when no completions to reset', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    const res = await resetCell(grid.id, row.id, cells[0].id);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('CONFLICT');
  });

  it('keeps all completion records intact after reset', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    await completeCell(grid.id, row.id, cells[0].id);
    const res = await resetCell(grid.id, row.id, cells[0].id);
    const body = await res.json();
    expect(body.completions).toHaveLength(1);
  });

  it('returns 404 for non-existent cell', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row } = await createGridWithCells(user.id, 1);

    const res = await resetCell(grid.id, row.id, '00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

// ─── Update Fade ──────────────────────────────────────────────────────────────

describe('Grid API — Update Fade', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  function makeFadeRequest(gridId: string, body: unknown): NextRequest {
    return new NextRequest(`http://localhost:3000/api/grids/${gridId}/fade`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 200 and updates fadeEnabled to false', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: user.id, name: 'Fade Grid', fadeEnabled: true },
    });

    const res = await updateFade(grid.id, makeFadeRequest(grid.id, { fadeEnabled: false }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.fadeEnabled).toBe(false);
  });

  it('returns 200 and updates fadeEnabled to true', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: user.id, name: 'Fade Grid', fadeEnabled: false },
    });

    const res = await updateFade(grid.id, makeFadeRequest(grid.id, { fadeEnabled: true }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.fadeEnabled).toBe(true);
  });

  it('returns 400 when fadeEnabled is not a boolean', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: user.id, name: 'Fade Grid' },
    });

    const res = await updateFade(grid.id, makeFadeRequest(grid.id, { fadeEnabled: 'yes' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when body is empty', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: user.id, name: 'Fade Grid' },
    });

    const res = await updateFade(grid.id, makeFadeRequest(grid.id, {}));
    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed grid ID', async () => {
    const res = await updateFade('not-a-uuid', makeFadeRequest('not-a-uuid', { fadeEnabled: true }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for non-existent grid', async () => {
    const res = await updateFade(
      '00000000-0000-0000-0000-000000000000',
      makeFadeRequest('00000000-0000-0000-0000-000000000000', { fadeEnabled: true }),
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 for grid owned by different user', async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: `other-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Other',
        instruments: [],
      },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: otherUser.id, name: 'Other Grid' },
    });

    const res = await updateFade(grid.id, makeFadeRequest(grid.id, { fadeEnabled: false }));
    expect(res.status).toBe(404);
  });
});

// ─── Auth failure for updateFade ──────────────────────────────────────────────

describe('Grid API — Update Fade Auth failure', () => {
  it('returns 401 when auth fails on updateFade', async () => {
    const req = new NextRequest('http://localhost:3000/api/grids/00000000-0000-0000-0000-000000000000/fade', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fadeEnabled: true }),
    });
    const res = await updateFade('00000000-0000-0000-0000-000000000000', req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });
});

// ─── Interval Progression ────────────────────────────────────────────────────

describe('Cell API — Interval Progression', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('complete fresh cell: interval doubles (1 → 2)', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);
    const cell = cells[0];

    // First completion: interval becomes 1 (incomplete → 1)
    const first = await completeCell(grid.id, row.id, cell.id);
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    expect(firstBody.freshnessIntervalDays).toBe(1);

    // Backdate completion to yesterday so we can complete again today
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayUTC = new Date(Date.UTC(
      yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(),
    ));
    await prisma.practiceCellCompletion.updateMany({
      where: { practiceCellId: cell.id },
      data: { completionDate: yesterdayUTC },
    });

    // Second completion: cell is fresh (daysSince=1 <= interval*0.5? No, 1 > 0.5, but <= 1 = aging)
    // Actually with interval=1: daysSince=1 <= 1*0.5=0.5? No. daysSince=1 <= 1? Yes → aging.
    // Aging → interval doubles: 1 * 2 = 2
    const second = await completeCell(grid.id, row.id, cell.id);
    expect(second.status).toBe(201);
    const secondBody = await second.json();
    expect(secondBody.freshnessIntervalDays).toBe(2);
  });

  it('complete stale cell: interval resets to 1', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);
    const cell = cells[0];

    // First completion: interval becomes 1
    await completeCell(grid.id, row.id, cell.id);

    // Directly set interval to 4 via DB (simulating built-up interval)
    await prisma.practiceCell.update({
      where: { id: cell.id },
      data: { freshnessIntervalDays: 4 },
    });

    // Backdate completion to 5 days ago to make cell stale
    // (daysSince=5 > interval=4 but <= interval*2=8 → stale)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setUTCDate(fiveDaysAgo.getUTCDate() - 5);
    const fiveDaysAgoUTC = new Date(Date.UTC(
      fiveDaysAgo.getUTCFullYear(), fiveDaysAgo.getUTCMonth(), fiveDaysAgo.getUTCDate(),
    ));
    await prisma.practiceCellCompletion.updateMany({
      where: { practiceCellId: cell.id, deletedAt: null },
      data: { completionDate: fiveDaysAgoUTC },
    });

    // Complete again: stale → interval resets to 1
    const res = await completeCell(grid.id, row.id, cell.id);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.freshnessIntervalDays).toBe(1);
  });

  it('complete a shielded cell: interval uses raw state (stale), not effective state (fresh)', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    // Create 2 cells: cell[0] (lower tempo) and cell[1] (higher tempo)
    const { grid, row, cells } = await createGridWithCells(user.id, 2);

    // Complete both cells
    await completeCell(grid.id, row.id, cells[0].id);
    await completeCell(grid.id, row.id, cells[1].id);

    // Set cell[0]'s interval to 4 (simulating built-up interval)
    await prisma.practiceCell.update({
      where: { id: cells[0].id },
      data: { freshnessIntervalDays: 4 },
    });

    // Backdate cell[0]'s completion to 5 days ago → raw state = stale
    // (daysSince=5 > interval=4 but <= interval*2=8 → stale)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setUTCDate(fiveDaysAgo.getUTCDate() - 5);
    const fiveDaysAgoUTC = new Date(Date.UTC(
      fiveDaysAgo.getUTCFullYear(), fiveDaysAgo.getUTCMonth(), fiveDaysAgo.getUTCDate(),
    ));
    await prisma.practiceCellCompletion.updateMany({
      where: { practiceCellId: cells[0].id, deletedAt: null },
      data: { completionDate: fiveDaysAgoUTC },
    });

    // Cell[0] is shielded (cell[1] above it is fresh, NOT decayed),
    // but raw state is stale (daysSince=5 > interval=4).
    // Verify via grid detail that cell[0] is shielded with effective state 'fresh'
    const gridRes = await getGrid(grid.id);
    const gridBody = await gridRes.json();
    const rowData = gridBody.rows[0];
    expect(rowData.cells[0].isShielded).toBe(true);
    expect(rowData.cells[0].freshnessState).toBe('fresh'); // effective (shielded)

    // Now complete the shielded cell: should use RAW state (stale) → interval resets to 1
    const res = await completeCell(grid.id, row.id, cells[0].id);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.freshnessIntervalDays).toBe(1); // reset, not doubled
  });
});

// ─── Fade Toggle Effects ─────────────────────────────────────────────────────

describe('Cell API — Fade Toggle Effects', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  function makeFadeRequest(gridId: string, body: unknown): NextRequest {
    return new NextRequest(`http://localhost:3000/api/grids/${gridId}/fade`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('fade OFF: all completed cells = 100% completion', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 3);

    // Complete all 3 cells
    for (const cell of cells) {
      await completeCell(grid.id, row.id, cell.id);
    }

    // Turn fade off
    const fadeRes = await updateFade(grid.id, makeFadeRequest(grid.id, { fadeEnabled: false }));
    const fadeBody = await fadeRes.json();
    expect(fadeBody.fadeEnabled).toBe(false);
    expect(fadeBody.completionPercentage).toBe(100);

    // All cells should show fresh state when fade is off
    const rowData = fadeBody.rows[0];
    for (const cell of rowData.cells) {
      expect(cell.freshnessState).toBe('fresh');
    }
  });

  it('fade ON: decayed cells excluded from completion percentage', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 2);

    // Complete both cells
    await completeCell(grid.id, row.id, cells[0].id);
    await completeCell(grid.id, row.id, cells[1].id);

    // Backdate both to make them decayed: interval=1, need daysSince > 2
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setUTCDate(fiveDaysAgo.getUTCDate() - 5);
    const fiveDaysAgoUTC = new Date(Date.UTC(
      fiveDaysAgo.getUTCFullYear(), fiveDaysAgo.getUTCMonth(), fiveDaysAgo.getUTCDate(),
    ));
    await prisma.practiceCellCompletion.updateMany({
      where: { practiceCellId: { in: [cells[0].id, cells[1].id] } },
      data: { completionDate: fiveDaysAgoUTC },
    });

    // Grid has fade ON by default
    const gridRes = await getGrid(grid.id);
    const gridBody = await gridRes.json();
    expect(gridBody.fadeEnabled).toBe(true);
    // Both decayed → 0% (decayed cells excluded from completion percentage)
    expect(gridBody.completionPercentage).toBe(0);
  });
});

// ─── UTC Date-Boundary Tests ─────────────────────────────────────────────────

describe('Cell API — UTC Date Boundaries', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('backdate completion to yesterday, complete again today → 201', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    // Complete today
    const first = await completeCell(grid.id, row.id, cells[0].id);
    expect(first.status).toBe(201);

    // Backdate to yesterday
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayUTC = new Date(Date.UTC(
      yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(),
    ));
    await prisma.practiceCellCompletion.updateMany({
      where: { practiceCellId: cells[0].id },
      data: { completionDate: yesterdayUTC },
    });

    // Complete again today — different UTC date, should succeed
    const second = await completeCell(grid.id, row.id, cells[0].id);
    expect(second.status).toBe(201);
  });

  it('completionDate in response is YYYY-MM-DD format', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    const res = await completeCell(grid.id, row.id, cells[0].id);
    const body = await res.json();

    // lastCompletionDate should be YYYY-MM-DD
    expect(body.lastCompletionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Completions array also uses YYYY-MM-DD
    expect(body.completions[0].completionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('backdate to same UTC date, attempt again → 409', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    // Complete today
    await completeCell(grid.id, row.id, cells[0].id);

    // "Backdate" to same UTC date (today) — this is a no-op but simulates
    // a scenario where the completion is still on today's date
    const todayUTC = new Date(Date.UTC(
      new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(),
    ));
    await prisma.practiceCellCompletion.updateMany({
      where: { practiceCellId: cells[0].id },
      data: { completionDate: todayUTC },
    });

    // Attempt again → 409 (same UTC date)
    const second = await completeCell(grid.id, row.id, cells[0].id);
    expect(second.status).toBe(409);
  });
});

// ─── Concurrent Same-Day Completion ──────────────────────────────────────────

describe('Cell API — Concurrent Same-Day Completion', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('Promise.all: exactly one 201 and one 409', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 1);

    const [res1, res2] = await Promise.all([
      completeCell(grid.id, row.id, cells[0].id),
      completeCell(grid.id, row.id, cells[0].id),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });
});

// ─── Cascading Fade ──────────────────────────────────────────────────────────

describe('Cell API — Cascading Fade', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('fades highest cell first, then cascades down', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const { grid, row, cells } = await createGridWithCells(user.id, 6);

    // Complete all 6 cells
    for (const cell of cells) {
      await completeCell(grid.id, row.id, cell.id);
    }

    // Fetch grid detail — verify only highest cell (index 5) is unshielded
    let gridRes = await getGrid(grid.id);
    let gridBody = await gridRes.json();
    let rowData = gridBody.rows[0];
    expect(rowData.cells[5].isShielded).toBe(false); // highest completed = unshielded
    expect(rowData.cells[4].isShielded).toBe(true);  // shielded by cell 5
    expect(rowData.cells[3].isShielded).toBe(true);
    expect(rowData.cells[2].isShielded).toBe(true);
    expect(rowData.cells[1].isShielded).toBe(true);
    expect(rowData.cells[0].isShielded).toBe(true);

    // Backdate highest cell's completion to make it decayed
    // interval=1, decayed = daysSince > 2. Set completion to 5 days ago.
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setUTCDate(fiveDaysAgo.getUTCDate() - 5);
    const fiveDaysAgoUTC = new Date(Date.UTC(
      fiveDaysAgo.getUTCFullYear(), fiveDaysAgo.getUTCMonth(), fiveDaysAgo.getUTCDate(),
    ));
    await prisma.practiceCellCompletion.updateMany({
      where: { practiceCellId: cells[5].id, deletedAt: null },
      data: { completionDate: fiveDaysAgoUTC },
    });

    // Re-fetch — cell 5 is decayed, cell 4 is now unshielded, rest still shielded
    gridRes = await getGrid(grid.id);
    gridBody = await gridRes.json();
    rowData = gridBody.rows[0];
    expect(rowData.cells[5].freshnessState).toBe('decayed');
    expect(rowData.cells[5].isShielded).toBe(false); // highest, never shielded
    expect(rowData.cells[4].isShielded).toBe(false); // shield has fallen (cell 5 decayed)
    expect(rowData.cells[3].isShielded).toBe(true);  // still shielded by cell 4
    expect(rowData.cells[2].isShielded).toBe(true);
    expect(rowData.cells[1].isShielded).toBe(true);
    expect(rowData.cells[0].isShielded).toBe(true);

    // Verify completion percentage changed: with fade ON, decayed cells excluded
    // 5 fresh/aging/stale + 1 decayed = 5/6 * 100 = 83.33%
    // But cell 4 is now unshielded and fresh (completed today), so still counts
    expect(gridBody.completionPercentage).toBeCloseTo(500 / 6, 1);
  });
});
