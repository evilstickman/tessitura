import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getTestPrisma } from '../../helpers/db';
import {
  createSeedUser as createSeedUserWith,
  createOtherUser as createOtherUserWith,
} from '../../helpers/fixtures';
import {
  createGoal,
  listGoals,
  getGoal,
  updateGoal,
  deleteGoal,
} from '@/controllers/goal';

const prisma = getTestPrisma();
const createSeedUser = () => createSeedUserWith(prisma);
const createOtherUser = () => createOtherUserWith(prisma);

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makePutRequest(goalId: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/goals/${goalId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeListRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/goals');
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

// ─── Auth failure ────────────────────────────────────────────────────────────

describe('Goal API — Auth failure', () => {
  it('returns 401 on create without seed user', async () => {
    const res = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 30 }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 on list without seed user', async () => {
    const res = await listGoals(makeListRequest());
    expect(res.status).toBe(401);
  });

  it('returns 401 on get without seed user', async () => {
    const res = await getGoal('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  it('returns 401 on update without seed user', async () => {
    const res = await updateGoal(
      '00000000-0000-0000-0000-000000000000',
      makePutRequest('00000000-0000-0000-0000-000000000000', { targetValue: 60 }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 on delete without seed user', async () => {
    const res = await deleteGoal('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });
});

// ─── Create ─────────────────────────────────────────────────────────────────

describe('Goal API — Create', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('POST with valid input returns 201', async () => {
    const res = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 30 }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.goalType).toBe('DAILY_MINUTES');
    expect(body.targetValue).toBe(30);
    expect(body.active).toBe(true);
  });

  it('POST with invalid goalType returns 400', async () => {
    const res = await createGoal(makePostRequest({ goalType: 'HOURLY', targetValue: 30 }));
    expect(res.status).toBe(400);
  });

  it('POST with targetValue 0 returns 400', async () => {
    const res = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 0 }),
    );
    expect(res.status).toBe(400);
  });

  it('POST with targetValue > 10000 returns 400', async () => {
    const res = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 10001 }),
    );
    expect(res.status).toBe(400);
  });

  it('POST with empty body returns 400', async () => {
    const res = await createGoal(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it('POST duplicate active goalType returns 409', async () => {
    const first = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 30 }),
    );
    expect(first.status).toBe(201);

    const second = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 45 }),
    );
    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.error.code).toBe('CONFLICT');
  });

  it('POST allows different active goalTypes', async () => {
    await createGoal(makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 30 }));
    const second = await createGoal(
      makePostRequest({ goalType: 'WEEKLY_MINUTES', targetValue: 180 }),
    );
    expect(second.status).toBe(201);
  });

  it('POST allows same goalType after deactivation', async () => {
    const first = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 30 }),
    );
    const firstBody = await first.json();
    await updateGoal(firstBody.id, makePutRequest(firstBody.id, { active: false }));

    const second = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 45 }),
    );
    expect(second.status).toBe(201);
  });
});

// ─── List ───────────────────────────────────────────────────────────────────

describe('Goal API — List', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('GET returns empty array when none exist', async () => {
    const res = await listGoals(makeListRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('GET returns active goals only by default', async () => {
    const first = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 30 }),
    );
    const firstBody = await first.json();
    await updateGoal(firstBody.id, makePutRequest(firstBody.id, { active: false }));

    await createGoal(makePostRequest({ goalType: 'WEEKLY_MINUTES', targetValue: 180 }));

    const res = await listGoals(makeListRequest());
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].goalType).toBe('WEEKLY_MINUTES');
  });

  it('GET ?all=true returns active and inactive goals', async () => {
    const first = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 30 }),
    );
    const firstBody = await first.json();
    await updateGoal(firstBody.id, makePutRequest(firstBody.id, { active: false }));

    await createGoal(makePostRequest({ goalType: 'WEEKLY_MINUTES', targetValue: 180 }));

    const res = await listGoals(makeListRequest({ all: 'true' }));
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('GET scopes to current user', async () => {
    await createGoal(makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 30 }));

    const otherUser = await createOtherUser();
    await prisma.practiceGoal.create({
      data: { userId: otherUser.id, goalType: 'WEEKLY_MINUTES', targetValue: 99 },
    });

    const res = await listGoals(makeListRequest());
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].goalType).toBe('DAILY_MINUTES');
  });
});

// ─── Get by ID ──────────────────────────────────────────────────────────────

describe('Goal API — Get by ID', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('GET /{id} returns the goal', async () => {
    const create = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 30 }),
    );
    const created = await create.json();

    const res = await getGoal(created.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(created.id);
  });

  it('GET /{id} returns 404 for non-existent', async () => {
    const res = await getGoal('00000000-0000-0000-0000-999999999999');
    expect(res.status).toBe(404);
  });

  it('GET /{id} returns 404 for other-user goal', async () => {
    const otherUser = await createOtherUser();
    const otherGoal = await prisma.practiceGoal.create({
      data: { userId: otherUser.id, goalType: 'DAILY_MINUTES', targetValue: 30 },
    });
    const res = await getGoal(otherGoal.id);
    expect(res.status).toBe(404);
  });

  it('GET /{id} with malformed UUID returns 400', async () => {
    const res = await getGoal('bad-uuid');
    expect(res.status).toBe(400);
  });
});

// ─── Update ─────────────────────────────────────────────────────────────────

describe('Goal API — Update', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  async function createdId(): Promise<string> {
    const res = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 30 }),
    );
    const body = await res.json();
    return body.id;
  }

  it('PUT updates targetValue', async () => {
    const id = await createdId();
    const res = await updateGoal(id, makePutRequest(id, { targetValue: 60 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.targetValue).toBe(60);
  });

  it('PUT updates active', async () => {
    const id = await createdId();
    const res = await updateGoal(id, makePutRequest(id, { active: false }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.active).toBe(false);
  });

  it('PUT rejects goalType in body (400)', async () => {
    const id = await createdId();
    const res = await updateGoal(
      id,
      makePutRequest(id, { goalType: 'WEEKLY_MINUTES' }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message.toLowerCase()).toContain('goaltype');
  });

  it('PUT rejects invalid targetValue', async () => {
    const id = await createdId();
    const res = await updateGoal(id, makePutRequest(id, { targetValue: 0 }));
    expect(res.status).toBe(400);
  });

  it('PUT rejects non-number targetValue (type check)', async () => {
    const id = await createdId();
    const res = await updateGoal(id, makePutRequest(id, { targetValue: '60' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message.toLowerCase()).toContain('targetvalue');
  });

  it('PUT rejects non-boolean active (type check)', async () => {
    const id = await createdId();
    const res = await updateGoal(id, makePutRequest(id, { active: 'yes' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message.toLowerCase()).toContain('active');
  });

  it('PUT rejects empty body', async () => {
    const id = await createdId();
    const req = new NextRequest(`http://localhost:3000/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json',
    });
    const res = await updateGoal(id, req);
    expect(res.status).toBe(400);
  });

  it('PUT returns 404 for non-existent', async () => {
    const res = await updateGoal(
      '00000000-0000-0000-0000-999999999999',
      makePutRequest('00000000-0000-0000-0000-999999999999', { targetValue: 60 }),
    );
    expect(res.status).toBe(404);
  });

  it('PUT enforces ownership (404 for other-user)', async () => {
    const otherUser = await createOtherUser();
    const otherGoal = await prisma.practiceGoal.create({
      data: { userId: otherUser.id, goalType: 'DAILY_MINUTES', targetValue: 30 },
    });
    const res = await updateGoal(
      otherGoal.id,
      makePutRequest(otherGoal.id, { targetValue: 60 }),
    );
    expect(res.status).toBe(404);
  });

  it('PUT with malformed UUID returns 400', async () => {
    const res = await updateGoal('bad-uuid', makePutRequest('bad-uuid', { targetValue: 60 }));
    expect(res.status).toBe(400);
  });
});

// ─── Delete ─────────────────────────────────────────────────────────────────

describe('Goal API — Delete', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('DELETE soft-deletes and returns 204', async () => {
    const create = await createGoal(
      makePostRequest({ goalType: 'DAILY_MINUTES', targetValue: 30 }),
    );
    const created = await create.json();

    const res = await deleteGoal(created.id);
    expect(res.status).toBe(204);

    const raw = await prisma.practiceGoal.findUnique({ where: { id: created.id } });
    expect(raw?.deletedAt).not.toBeNull();
  });

  it('DELETE returns 404 for non-existent', async () => {
    const res = await deleteGoal('00000000-0000-0000-0000-999999999999');
    expect(res.status).toBe(404);
  });

  it('DELETE returns 404 for other-user goal', async () => {
    const otherUser = await createOtherUser();
    const otherGoal = await prisma.practiceGoal.create({
      data: { userId: otherUser.id, goalType: 'DAILY_MINUTES', targetValue: 30 },
    });
    const res = await deleteGoal(otherGoal.id);
    expect(res.status).toBe(404);
  });
});
