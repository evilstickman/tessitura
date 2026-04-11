import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getTestPrisma } from '../../helpers/db';
import { createSeedUser as createSeedUserWith } from '../../helpers/fixtures';
import {
  listTemplates,
  getTemplate,
  cloneTemplate,
} from '@/controllers/template';

const prisma = getTestPrisma();
const createSeedUser = () => createSeedUserWith(prisma);

function makeListRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/templates');
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

async function seedTemplate(overrides: {
  id?: string;
  title?: string;
  author?: string;
  instrumentTags?: string[];
  gridType?: 'REPERTOIRE' | 'TECHNIQUE';
  active?: boolean;
  gridData?: object;
} = {}) {
  return prisma.libraryTemplate.create({
    data: {
      id: overrides.id,
      title: overrides.title ?? 'Clarke Technical Studies',
      author: overrides.author ?? 'Herbert L. Clarke',
      collection: 'Technical Studies for the Cornet',
      instrumentTags: overrides.instrumentTags ?? ['trumpet', 'cornet', 'brass'],
      gridType: overrides.gridType ?? 'REPERTOIRE',
      active: overrides.active ?? true,
      gridData: (overrides.gridData ?? {
        rows: [
          { passageLabel: 'Study #1', startMeasure: 1, endMeasure: 16, targetTempo: 120, steps: 5 },
          { passageLabel: 'Study #2', startMeasure: 1, endMeasure: 24, targetTempo: 108, steps: 4 },
        ],
      }) as object,
    },
  });
}

// ─── Auth failure ────────────────────────────────────────────────────────────

describe('Template API — Auth failure', () => {
  it('returns 401 on list without seed user', async () => {
    const res = await listTemplates(makeListRequest());
    expect(res.status).toBe(401);
  });

  it('returns 401 on get without seed user', async () => {
    const res = await getTemplate('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  it('returns 401 on clone without seed user', async () => {
    const res = await cloneTemplate('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });
});

// ─── List ───────────────────────────────────────────────────────────────────

describe('Template API — List', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('GET returns empty array when no templates', async () => {
    const res = await listTemplates(makeListRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('GET returns active templates only', async () => {
    await seedTemplate({ title: 'Active' });
    await seedTemplate({ title: 'Inactive', active: false });

    const res = await listTemplates(makeListRequest());
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('Active');
  });

  it('GET does not include gridData in list response (summary only)', async () => {
    await seedTemplate({ title: 'With GridData' });
    const res = await listTemplates(makeListRequest());
    const body = await res.json();
    expect(body[0]).not.toHaveProperty('gridData');
  });

  it('GET includes instrumentTags and gridType', async () => {
    await seedTemplate({ title: 'Tagged', instrumentTags: ['trumpet'] });
    const res = await listTemplates(makeListRequest());
    const body = await res.json();
    expect(body[0].instrumentTags).toEqual(['trumpet']);
    expect(body[0].gridType).toBe('REPERTOIRE');
  });

  it('GET ?instrument=trumpet filters (case-insensitive substring)', async () => {
    await seedTemplate({ title: 'Trumpet Studies', instrumentTags: ['trumpet'] });
    await seedTemplate({ title: 'Violin Studies', instrumentTags: ['violin'] });
    await seedTemplate({ title: 'Brass Ensemble', instrumentTags: ['trumpet', 'horn'] });

    const res = await listTemplates(makeListRequest({ instrument: 'TRUMPET' }));
    const body = await res.json();
    expect(body).toHaveLength(2);
    const titles = body.map((t: { title: string }) => t.title).sort();
    expect(titles).toEqual(['Brass Ensemble', 'Trumpet Studies']);
  });
});

// ─── Get detail ─────────────────────────────────────────────────────────────

describe('Template API — Get detail', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('GET /{id} returns template with gridData', async () => {
    const template = await seedTemplate();
    const res = await getTemplate(template.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(template.id);
    expect(body.gridData).toBeDefined();
    expect(body.gridData.rows).toHaveLength(2);
  });

  it('GET /{id} returns 404 for non-existent template', async () => {
    const res = await getTemplate('00000000-0000-0000-0000-999999999999');
    expect(res.status).toBe(404);
  });

  it('GET /{id} returns 404 for inactive template', async () => {
    const template = await seedTemplate({ active: false });
    const res = await getTemplate(template.id);
    expect(res.status).toBe(404);
  });

  it('GET /{id} with malformed UUID returns 400', async () => {
    const res = await getTemplate('bad-uuid');
    expect(res.status).toBe(400);
  });
});

// ─── Clone ──────────────────────────────────────────────────────────────────

describe('Template API — Clone', () => {
  beforeEach(async () => {
    await createSeedUser();
  });

  it('POST /{id}/clone creates a grid with rows and cells', async () => {
    const template = await seedTemplate();
    const res = await cloneTemplate(template.id);
    expect(res.status).toBe(201);
    const body = await res.json();

    // Grid fields
    expect(body.name).toBe('Clarke Technical Studies');
    expect(body.gridType).toBe('REPERTOIRE');
    expect(body.sourceTemplateId).toBe(template.id);
    expect(body.archived).toBe(false);
    expect(body.fadeEnabled).toBe(true);

    // Grid detail fields
    expect(body.rows).toHaveLength(2);
    expect(body.rows[0].cells).toHaveLength(5);
    expect(body.rows[1].cells).toHaveLength(4);

    // Passage labels carried through
    expect(body.rows[0].passageLabel).toBe('Study #1');
    expect(body.rows[1].passageLabel).toBe('Study #2');

    // Cells use the standard percentage formula — last cell is always 100%
    expect(body.rows[0].cells[4].targetTempoBpm).toBe(120);
    expect(body.rows[1].cells[3].targetTempoBpm).toBe(108);
  });

  it('POST /{id}/clone uses template.gridType (TECHNIQUE)', async () => {
    const template = await seedTemplate({ gridType: 'TECHNIQUE' });
    const res = await cloneTemplate(template.id);
    const body = await res.json();
    expect(body.gridType).toBe('TECHNIQUE');
  });

  it('POST /{id}/clone is transactional — no partial grid on validation failure', async () => {
    // Create template with invalid gridData directly via prisma (bypass validation)
    const template = await seedTemplate({
      title: 'Bad Template',
      gridData: {
        rows: [
          { passageLabel: 'OK', startMeasure: 1, endMeasure: 4, targetTempo: 100, steps: 3 },
          // Second row fails validation (steps > 50)
          { passageLabel: 'Bad', startMeasure: 1, endMeasure: 4, targetTempo: 100, steps: 99 },
        ],
      },
    });

    const res = await cloneTemplate(template.id);
    expect(res.status).toBe(400);

    // Assert no partial grid was created — count all practice_grids for seed user
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'dev-placeholder@tessitura.local' },
    });
    const grids = await prisma.practiceGrid.findMany({ where: { userId: user.id } });
    expect(grids).toHaveLength(0);
  });

  it('POST /{id}/clone returns 404 for non-existent template', async () => {
    const res = await cloneTemplate('00000000-0000-0000-0000-999999999999');
    expect(res.status).toBe(404);
  });

  it('POST /{id}/clone returns 404 for inactive template', async () => {
    const template = await seedTemplate({ active: false });
    const res = await cloneTemplate(template.id);
    expect(res.status).toBe(404);
  });

  it('POST /{id}/clone with malformed UUID returns 400', async () => {
    const res = await cloneTemplate('bad-uuid');
    expect(res.status).toBe(400);
  });

  it('POST /{id}/clone creates distinct grids on repeated clones', async () => {
    const template = await seedTemplate();
    const first = await cloneTemplate(template.id);
    const firstBody = await first.json();
    const second = await cloneTemplate(template.id);
    const secondBody = await second.json();
    expect(firstBody.id).not.toBe(secondBody.id);
    expect(firstBody.sourceTemplateId).toBe(template.id);
    expect(secondBody.sourceTemplateId).toBe(template.id);
  });
});
