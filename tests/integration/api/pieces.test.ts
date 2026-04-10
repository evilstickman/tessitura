import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getTestPrisma } from '../../helpers/db';
import {
  createSeedUser as createSeedUserWith,
  createOtherUser as createOtherUserWith,
} from '../../helpers/fixtures';
import {
  createPiece,
  listPieces,
  getPiece,
  updatePiece,
  deletePiece,
} from '@/controllers/piece';

const prisma = getTestPrisma();
const createSeedUser = () => createSeedUserWith(prisma);
const createOtherUser = () => createOtherUserWith(prisma);

function makeRequest(body: unknown, url = 'http://localhost:3000/api/pieces'): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Error handling ──────────────────────────────────────────────────────────

describe('Piece API — Auth failure (placeholder auth, pre-M1.8)', () => {
  // No seed user created — exercises the AuthenticationError → 401 path
  it('returns 401 when auth fails on createPiece', async () => {
    const res = await createPiece(makeRequest({ title: 'Test' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when auth fails on listPieces', async () => {
    const res = await listPieces();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });
});

// ─── Create ──────────────────────────────────────────────────────────────────

describe('Piece API — Create', () => {
  beforeEach(createSeedUser);

  it('POST with valid title returns 201', async () => {
    const res = await createPiece(makeRequest({ title: 'Firebird Suite' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('Firebird Suite');
    expect(body.composer).toBeNull();
    expect(body.id).toMatch(/^[0-9a-f]{8}-/);
  });

  it('POST with all fields returns 201', async () => {
    const res = await createPiece(
      makeRequest({
        title: 'Clarke #3',
        composer: 'Herbert L. Clarke',
        part: 'Cornet',
        studyReference: 'Technical Studies, p.12',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.composer).toBe('Herbert L. Clarke');
    expect(body.studyReference).toBe('Technical Studies, p.12');
  });

  it('POST with invalid JSON returns 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/pieces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await createPiece(req);
    expect(res.status).toBe(400);
  });

  it('POST with missing title returns 400', async () => {
    const res = await createPiece(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST with empty title returns 400', async () => {
    const res = await createPiece(makeRequest({ title: '   ' }));
    expect(res.status).toBe(400);
  });

  it('POST with title over 200 chars returns 400', async () => {
    const res = await createPiece(makeRequest({ title: 'a'.repeat(201) }));
    expect(res.status).toBe(400);
  });

  it('POST with non-string composer returns 400', async () => {
    const res = await createPiece(makeRequest({ title: 'Test', composer: 123 }));
    expect(res.status).toBe(400);
  });

  it('POST response has no userId or deletedAt', async () => {
    const res = await createPiece(makeRequest({ title: 'Test' }));
    const body = await res.json();
    expect(body).not.toHaveProperty('userId');
    expect(body).not.toHaveProperty('deletedAt');
  });
});

// ─── List ────────────────────────────────────────────────────────────────────

describe('Piece API — List', () => {
  beforeEach(createSeedUser);

  it('GET returns empty array when no pieces', async () => {
    const res = await listPieces();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('GET returns only user\'s pieces', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const otherUser = await createOtherUser();

    await prisma.piece.create({ data: { userId: seedUser.id, title: 'Mine' } });
    await prisma.piece.create({ data: { userId: otherUser.id, title: 'Not Mine' } });

    const res = await listPieces();
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Mine');
  });

  it('GET excludes soft-deleted pieces', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });

    await prisma.piece.create({ data: { userId: seedUser.id, title: 'Active' } });
    await prisma.piece.create({
      data: { userId: seedUser.id, title: 'Deleted', deletedAt: new Date() },
    });

    const res = await listPieces();
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Active');
  });
});

// ─── Get Detail ──────────────────────────────────────────────────────────────

describe('Piece API — Detail', () => {
  beforeEach(createSeedUser);

  it('GET returns piece by ID', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const piece = await prisma.piece.create({
      data: { userId: seedUser.id, title: 'Detail Test' },
    });

    const res = await getPiece(piece.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Detail Test');
  });

  it('GET returns 404 for non-existent ID', async () => {
    const res = await getPiece('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('GET returns 404 for other user\'s piece', async () => {
    const otherUser = await createOtherUser();
    const piece = await prisma.piece.create({
      data: { userId: otherUser.id, title: 'Not Mine' },
    });

    const res = await getPiece(piece.id);
    expect(res.status).toBe(404);
  });

  it('GET returns 404 for soft-deleted piece', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const piece = await prisma.piece.create({
      data: { userId: seedUser.id, title: 'Deleted', deletedAt: new Date() },
    });

    const res = await getPiece(piece.id);
    expect(res.status).toBe(404);
  });

  it('GET returns 400 for malformed UUID', async () => {
    const res = await getPiece('not-a-uuid');
    expect(res.status).toBe(400);
  });
});

// ─── Auth failures on getPiece/updatePiece/deletePiece ───────────────────────

describe('Piece API — Auth failure (placeholder auth, pre-M1.8)', () => {
  // No seed user — exercises AuthenticationError → 401 for remaining endpoints
  it('returns 401 when auth fails on getPiece', async () => {
    const res = await getPiece('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when auth fails on updatePiece', async () => {
    const res = await updatePiece(
      '00000000-0000-0000-0000-000000000000',
      makeRequest({ title: 'Test' }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when auth fails on deletePiece', async () => {
    const res = await deletePiece('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });
});

// ─── Update ──────────────────────────────────────────────────────────────────

describe('Piece API — Update', () => {
  beforeEach(createSeedUser);

  it('PUT updates title only', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const piece = await prisma.piece.create({
      data: { userId: seedUser.id, title: 'Original', composer: 'Bach' },
    });

    const res = await updatePiece(piece.id, makeRequest({ title: 'Updated' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Updated');
    expect(body.composer).toBe('Bach'); // unchanged
  });

  it('PUT with invalid JSON returns 400', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const piece = await prisma.piece.create({
      data: { userId: seedUser.id, title: 'Original' },
    });

    const req = new NextRequest('http://localhost:3000/api/pieces', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await updatePiece(piece.id, req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT with non-string title returns 400', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const piece = await prisma.piece.create({
      data: { userId: seedUser.id, title: 'Original' },
    });

    const res = await updatePiece(piece.id, makeRequest({ title: 42 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT with empty title returns 400', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const piece = await prisma.piece.create({
      data: { userId: seedUser.id, title: 'Original' },
    });

    const res = await updatePiece(piece.id, makeRequest({ title: '' }));
    expect(res.status).toBe(400);
  });

  it('PUT returns 404 for non-existent piece', async () => {
    const res = await updatePiece(
      '00000000-0000-0000-0000-000000000000',
      makeRequest({ title: 'New' }),
    );
    expect(res.status).toBe(404);
  });

  it('PUT with non-string composer returns 400', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const piece = await prisma.piece.create({
      data: { userId: seedUser.id, title: 'Original' },
    });

    const res = await updatePiece(piece.id, makeRequest({ composer: 123 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT with non-string part returns 400', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const piece = await prisma.piece.create({
      data: { userId: seedUser.id, title: 'Original' },
    });

    const res = await updatePiece(piece.id, makeRequest({ part: 456 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT with non-string studyReference returns 400', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const piece = await prisma.piece.create({
      data: { userId: seedUser.id, title: 'Original' },
    });

    const res = await updatePiece(piece.id, makeRequest({ studyReference: true }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT with malformed UUID returns 400', async () => {
    const res = await updatePiece('not-a-uuid', makeRequest({ title: 'Test' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT returns 404 for other user\'s piece', async () => {
    const otherUser = await createOtherUser();
    const piece = await prisma.piece.create({
      data: { userId: otherUser.id, title: 'Not Mine' },
    });

    const res = await updatePiece(piece.id, makeRequest({ title: 'Stolen' }));
    expect(res.status).toBe(404);
  });
});

// ─── Delete ──────────────────────────────────────────────────────────────────

describe('Piece API — Delete', () => {
  beforeEach(createSeedUser);

  it('DELETE returns 204 and soft-deletes', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const piece = await prisma.piece.create({
      data: { userId: seedUser.id, title: 'To Delete' },
    });

    const res = await deletePiece(piece.id);
    expect(res.status).toBe(204);

    const deleted = await prisma.piece.findUnique({ where: { id: piece.id } });
    expect(deleted!.deletedAt).not.toBeNull();
  });

  it('DELETE returns 400 for malformed UUID', async () => {
    const res = await deletePiece('not-a-uuid');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('DELETE returns 404 for non-existent piece', async () => {
    const res = await deletePiece('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('deleted piece no longer appears in list', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const piece = await prisma.piece.create({
      data: { userId: seedUser.id, title: 'Will Vanish' },
    });

    await deletePiece(piece.id);

    const res = await listPieces();
    const body = await res.json();
    expect(body).toHaveLength(0);
  });

  // Soft Delete Visibility Rule (CLAUDE.md § Soft Delete Visibility Rules):
  // Pieces on rows are ALWAYS shown, even if soft-deleted. Historical context.
  it('soft-deleted piece still displays on rows via grid detail', async () => {
    const seedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const piece = await prisma.piece.create({
      data: { userId: seedUser.id, title: 'Archived Piece' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: seedUser.id, name: 'Test Grid' },
    });
    await prisma.practiceRow.create({
      data: {
        practiceGridId: grid.id,
        sortOrder: 0,
        pieceId: piece.id,
        startMeasure: 1,
        endMeasure: 8,
        targetTempo: 120,
        steps: 1,
      },
    });

    // Soft-delete the piece
    await deletePiece(piece.id);

    // Grid detail should still show piece data on the row
    const { getGrid } = await import('@/controllers/grid');
    const res = await getGrid(grid.id);
    const body = await res.json();
    expect(body.rows[0].piece).not.toBeNull();
    expect(body.rows[0].piece.title).toBe('Archived Piece');
  });
});
