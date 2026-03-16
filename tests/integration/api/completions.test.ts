import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getTestPrisma } from '../../helpers/db';
import {
  completeCell,
  undoCompletion,
  resetCell,
} from '@/controllers/cell';
import { updateFade } from '@/controllers/grid';

const prisma = getTestPrisma();

async function createSeedUser() {
  return prisma.user.upsert({
    where: { email: 'dev-placeholder@tessitura.local' },
    update: {},
    create: {
      email: 'dev-placeholder@tessitura.local',
      passwordHash: 'not-a-real-hash',
      displayName: 'Dev User',
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
        displayName: 'Other',
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
        displayName: 'Other',
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
