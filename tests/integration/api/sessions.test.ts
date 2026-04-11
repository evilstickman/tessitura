import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getTestPrisma } from '../../helpers/db';
import {
  createSeedUser as createSeedUserWith,
  createOtherUser as createOtherUserWith,
} from '../../helpers/fixtures';
import {
  createSession,
  listSessions,
  getSession,
  deleteSession,
} from '@/controllers/session';

const prisma = getTestPrisma();
const createSeedUser = () => createSeedUserWith(prisma);
const createOtherUser = () => createOtherUserWith(prisma);

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeListRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/sessions');
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

// ─── Auth failure ────────────────────────────────────────────────────────────

describe('Session API — Auth failure', () => {
  it('returns 401 on create without seed user', async () => {
    const res = await createSession(
      makePostRequest({ sessionDate: '2026-04-01', durationMinutes: 30 }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 on list without seed user', async () => {
    const res = await listSessions(makeListRequest());
    expect(res.status).toBe(401);
  });

  it('returns 401 on get without seed user', async () => {
    const res = await getSession('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  it('returns 401 on delete without seed user', async () => {
    const res = await deleteSession('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });
});

// ─── Create ─────────────────────────────────────────────────────────────────

describe('Session API — Create', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('POST with valid input returns 201', async () => {
    const res = await createSession(
      makePostRequest({ sessionDate: '2026-04-01', durationMinutes: 30, notes: 'Scales' }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.sessionDate).toBe('2026-04-01');
    expect(body.durationMinutes).toBe(30);
    expect(body.notes).toBe('Scales');
    expect(body.source).toBe('MANUAL');
    expect(body.practiceGridId).toBeNull();
  });

  it('POST with practiceGridId owned by user returns 201', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grid = await prisma.practiceGrid.create({
      data: { userId: user.id, name: 'Linked Grid' },
    });
    const res = await createSession(
      makePostRequest({
        sessionDate: '2026-04-01',
        durationMinutes: 45,
        practiceGridId: grid.id,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.practiceGridId).toBe(grid.id);
  });

  it('POST with practiceGridId for other user returns 400', async () => {
    const otherUser = await createOtherUser();
    const otherGrid = await prisma.practiceGrid.create({
      data: { userId: otherUser.id, name: 'Theirs' },
    });
    const res = await createSession(
      makePostRequest({
        sessionDate: '2026-04-01',
        durationMinutes: 30,
        practiceGridId: otherGrid.id,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST with invalid date returns 400', async () => {
    const res = await createSession(
      makePostRequest({ sessionDate: '04/01/2026', durationMinutes: 30 }),
    );
    expect(res.status).toBe(400);
  });

  it('POST with duration 0 returns 400', async () => {
    const res = await createSession(
      makePostRequest({ sessionDate: '2026-04-01', durationMinutes: 0 }),
    );
    expect(res.status).toBe(400);
  });

  it('POST with duration 1441 returns 400', async () => {
    const res = await createSession(
      makePostRequest({ sessionDate: '2026-04-01', durationMinutes: 1441 }),
    );
    expect(res.status).toBe(400);
  });

  it('POST with empty body returns 400', async () => {
    const res = await createSession(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it('POST with malformed practiceGridId returns 400', async () => {
    const res = await createSession(
      makePostRequest({
        sessionDate: '2026-04-01',
        durationMinutes: 30,
        practiceGridId: 'not-a-uuid',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST with non-number durationMinutes returns 400', async () => {
    const res = await createSession(
      makePostRequest({ sessionDate: '2026-04-01', durationMinutes: '30' }),
    );
    expect(res.status).toBe(400);
  });

  it('POST with non-string notes returns 400', async () => {
    const res = await createSession(
      makePostRequest({ sessionDate: '2026-04-01', durationMinutes: 30, notes: 123 }),
    );
    expect(res.status).toBe(400);
  });
});

// ─── List ───────────────────────────────────────────────────────────────────

describe('Session API — List', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  async function createFor(dates: string[]): Promise<void> {
    for (const d of dates) {
      await createSession(makePostRequest({ sessionDate: d, durationMinutes: 30 }));
    }
  }

  it('GET returns empty array when no sessions', async () => {
    const res = await listSessions(makeListRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('GET returns sessions sorted by sessionDate desc', async () => {
    await createFor(['2026-04-01', '2026-04-03', '2026-04-02']);

    const res = await listSessions(makeListRequest());
    const body = await res.json();
    expect(body).toHaveLength(3);
    expect(body[0].sessionDate).toBe('2026-04-03');
    expect(body[1].sessionDate).toBe('2026-04-02');
    expect(body[2].sessionDate).toBe('2026-04-01');
  });

  it('GET sorts same-day sessions by createdAt desc', async () => {
    await createSession(
      makePostRequest({ sessionDate: '2026-04-01', durationMinutes: 10, notes: 'first' }),
    );
    await createSession(
      makePostRequest({ sessionDate: '2026-04-01', durationMinutes: 20, notes: 'second' }),
    );
    const res = await listSessions(makeListRequest());
    const body = await res.json();
    expect(body[0].notes).toBe('second');
    expect(body[1].notes).toBe('first');
  });

  it('GET ?from filter is inclusive', async () => {
    await createFor(['2026-04-01', '2026-04-02', '2026-04-03']);
    const res = await listSessions(makeListRequest({ from: '2026-04-02' }));
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body.map((s: { sessionDate: string }) => s.sessionDate).sort()).toEqual([
      '2026-04-02',
      '2026-04-03',
    ]);
  });

  it('GET ?to filter is inclusive', async () => {
    await createFor(['2026-04-01', '2026-04-02', '2026-04-03']);
    const res = await listSessions(makeListRequest({ to: '2026-04-02' }));
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body.map((s: { sessionDate: string }) => s.sessionDate).sort()).toEqual([
      '2026-04-01',
      '2026-04-02',
    ]);
  });

  it('GET ?from=&to= combines both inclusively', async () => {
    await createFor(['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04']);
    const res = await listSessions(makeListRequest({ from: '2026-04-02', to: '2026-04-03' }));
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('GET ?from with invalid format returns 400', async () => {
    const res = await listSessions(makeListRequest({ from: '04/01/2026' }));
    expect(res.status).toBe(400);
  });

  it('GET scopes to current user (does not leak others)', async () => {
    await createFor(['2026-04-01']);

    const otherUser = await createOtherUser();
    await prisma.practiceSession.create({
      data: {
        userId: otherUser.id,
        sessionDate: new Date('2026-04-01T00:00:00Z'),
        durationMinutes: 99,
      },
    });

    const res = await listSessions(makeListRequest());
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it('GET excludes soft-deleted sessions', async () => {
    const create = await createSession(
      makePostRequest({ sessionDate: '2026-04-01', durationMinutes: 30 }),
    );
    const created = await create.json();
    await deleteSession(created.id);

    const res = await listSessions(makeListRequest());
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

// ─── Get by ID ──────────────────────────────────────────────────────────────

describe('Session API — Get by ID', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('GET /{id} returns the session', async () => {
    const create = await createSession(
      makePostRequest({ sessionDate: '2026-04-01', durationMinutes: 30 }),
    );
    const created = await create.json();

    const res = await getSession(created.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(created.id);
  });

  it('GET /{id} for non-existent session returns 404', async () => {
    const res = await getSession('00000000-0000-0000-0000-999999999999');
    expect(res.status).toBe(404);
  });

  it('GET /{id} for other-user session returns 404', async () => {
    const otherUser = await createOtherUser();
    const otherSession = await prisma.practiceSession.create({
      data: {
        userId: otherUser.id,
        sessionDate: new Date('2026-04-01T00:00:00Z'),
        durationMinutes: 30,
      },
    });
    const res = await getSession(otherSession.id);
    expect(res.status).toBe(404);
  });

  it('GET /{id} with malformed UUID returns 400', async () => {
    const res = await getSession('bad-uuid');
    expect(res.status).toBe(400);
  });
});

// ─── Delete ─────────────────────────────────────────────────────────────────

describe('Session API — Delete', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('DELETE soft-deletes and returns 204', async () => {
    const create = await createSession(
      makePostRequest({ sessionDate: '2026-04-01', durationMinutes: 30 }),
    );
    const created = await create.json();

    const res = await deleteSession(created.id);
    expect(res.status).toBe(204);

    // Raw client sees the soft-deleted row
    const raw = await prisma.practiceSession.findUnique({ where: { id: created.id } });
    expect(raw?.deletedAt).not.toBeNull();
  });

  it('DELETE for non-existent session returns 404', async () => {
    const res = await deleteSession('00000000-0000-0000-0000-999999999999');
    expect(res.status).toBe(404);
  });

  it('DELETE for other-user session returns 404', async () => {
    const otherUser = await createOtherUser();
    const otherSession = await prisma.practiceSession.create({
      data: {
        userId: otherUser.id,
        sessionDate: new Date('2026-04-01T00:00:00Z'),
        durationMinutes: 30,
      },
    });
    const res = await deleteSession(otherSession.id);
    expect(res.status).toBe(404);
  });

  it('DELETE with malformed UUID returns 400', async () => {
    const res = await deleteSession('bad-uuid');
    expect(res.status).toBe(400);
  });
});
