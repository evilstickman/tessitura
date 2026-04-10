import { test, expect, type Page } from '@playwright/test';

// All grid-view E2E tests mock the API via page.route() rather than relying on
// seed data in the running dev server. This keeps tests deterministic and
// runnable against any environment.

const TEST_GRID_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Fixed grid response shared by both functional and visual regression tests.
 * Dates are pinned so screenshots don't drift when run on different days.
 * Includes a mix of freshness states:
 * - Cell 1: fresh (completed 2026-03-15, shielded)
 * - Cell 2: fresh (completed 2026-03-15)
 * - Cell 3-5: incomplete
 */
const MOCK_GRID_RESPONSE = {
  id: TEST_GRID_ID,
  name: 'Audition Prep — Week 1',
  notes: 'Focus on Firebird excerpts and Clarke fundamentals',
  fadeEnabled: true,
  completionPercentage: 40,
  freshnessSummary: { fresh: 2, aging: 0, stale: 0, decayed: 0, incomplete: 3 },
  createdAt: '2026-03-10T00:00:00.000Z',
  updatedAt: '2026-03-15T00:00:00.000Z',
  rows: [
    {
      id: '00000000-0000-0000-0000-000000000100',
      sortOrder: 0,
      piece: { id: '00000000-0000-0000-0000-000000000010', title: 'Clarke #3 in Eb', composer: 'Herbert L. Clarke' },
      passageLabel: null,
      startMeasure: 1,
      endMeasure: 16,
      targetTempo: 120,
      steps: 5,
      priority: 'HIGH',
      completionPercentage: 40,
      freshnessSummary: { fresh: 2, aging: 0, stale: 0, decayed: 0, incomplete: 3 },
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-15T00:00:00.000Z',
      cells: [
        { id: 'c0', stepNumber: 0, targetTempoPercentage: 0.4, targetTempoBpm: 48, freshnessIntervalDays: 2, freshnessState: 'fresh', lastCompletionDate: '2026-03-15', isShielded: true, createdAt: '2026-03-10T00:00:00.000Z', updatedAt: '2026-03-15T00:00:00.000Z', completions: [{ id: 'comp-0', completionDate: '2026-03-15', createdAt: '2026-03-15T10:00:00.000Z' }] },
        { id: 'c1', stepNumber: 1, targetTempoPercentage: 0.55, targetTempoBpm: 66, freshnessIntervalDays: 1, freshnessState: 'fresh', lastCompletionDate: '2026-03-15', isShielded: false, createdAt: '2026-03-10T00:00:00.000Z', updatedAt: '2026-03-15T00:00:00.000Z', completions: [{ id: 'comp-1', completionDate: '2026-03-15', createdAt: '2026-03-15T10:00:00.000Z' }] },
        { id: 'c2', stepNumber: 2, targetTempoPercentage: 0.7, targetTempoBpm: 84, freshnessIntervalDays: 1, freshnessState: 'incomplete', lastCompletionDate: null, isShielded: false, createdAt: '2026-03-10T00:00:00.000Z', updatedAt: '2026-03-10T00:00:00.000Z', completions: [] },
        { id: 'c3', stepNumber: 3, targetTempoPercentage: 0.85, targetTempoBpm: 102, freshnessIntervalDays: 1, freshnessState: 'incomplete', lastCompletionDate: null, isShielded: false, createdAt: '2026-03-10T00:00:00.000Z', updatedAt: '2026-03-10T00:00:00.000Z', completions: [] },
        { id: 'c4', stepNumber: 4, targetTempoPercentage: 1.0, targetTempoBpm: 120, freshnessIntervalDays: 1, freshnessState: 'incomplete', lastCompletionDate: null, isShielded: false, createdAt: '2026-03-10T00:00:00.000Z', updatedAt: '2026-03-10T00:00:00.000Z', completions: [] },
      ],
    },
  ],
};

/** Same grid but with fadeEnabled=false — all completed cells show as 'fresh' */
const MOCK_GRID_FADE_OFF = {
  ...MOCK_GRID_RESPONSE,
  fadeEnabled: false,
  completionPercentage: 40,
  rows: MOCK_GRID_RESPONSE.rows.map((row) => ({
    ...row,
    cells: row.cells.map((cell) => ({
      ...cell,
      // With fade off, completed cells all show 'fresh', incomplete stay 'incomplete'
      freshnessState: cell.freshnessState === 'incomplete' ? 'incomplete' : 'fresh',
      isShielded: false,
    })),
  })),
};

async function mockDashboardList(page: Page) {
  await page.route('**/api/grids?detail=true', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: TEST_GRID_ID, name: 'Audition Prep — Week 1', notes: null, fadeEnabled: true,
        completionPercentage: 40, createdAt: '2026-03-10T00:00:00.000Z', updatedAt: '2026-03-15T00:00:00.000Z',
        freshnessSummary: { fresh: 2, aging: 0, stale: 0, decayed: 0, incomplete: 3 },
        rows: [],
      }]),
    });
  });
  await page.route('**/api/grids', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: TEST_GRID_ID, name: 'Audition Prep — Week 1' }]),
    });
  });
}

async function mockGridDetail(page: Page, payload: object = MOCK_GRID_RESPONSE) {
  await page.route(`**/api/grids/${TEST_GRID_ID}`, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
}

// ─── Functional tests (mocked API — deterministic) ──────────────────────────

test.describe('Grid View', () => {
  test('landing page shows grid list', async ({ page }) => {
    await mockDashboardList(page);
    await page.goto('/');
    await expect(page.getByText('Audition Prep — Week 1')).toBeVisible();
  });

  test('grid detail page renders heading and cells', async ({ page }) => {
    await mockGridDetail(page);
    await page.goto(`/grids/${TEST_GRID_ID}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Audition Prep');
    // Incomplete cells show BPM in their aria-label
    await expect(page.getByRole('button', { name: /84 BPM/ })).toBeVisible();
  });

  test('fade toggle is visible and clickable', async ({ page }) => {
    await mockGridDetail(page);
    // Stub the fade mutation endpoint — returns the same payload so refetch succeeds
    await page.route(`**/api/grids/${TEST_GRID_ID}/fade`, (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_GRID_RESPONSE) });
    });
    await page.goto(`/grids/${TEST_GRID_ID}`);
    const fadeToggle = page.getByRole('switch', { name: 'Toggle fade' });
    await expect(fadeToggle).toBeVisible();
    await fadeToggle.click();
  });

  test('helper legend is visible', async ({ page }) => {
    await mockGridDetail(page);
    await page.goto(`/grids/${TEST_GRID_ID}`);
    await expect(page.getByText('Click to complete')).toBeVisible();
  });

  test('grid not found shows message', async ({ page }) => {
    // Return 404 — NotFoundError short-circuits retry (Pass 4 retry filter),
    // so the error should surface immediately.
    await page.route('**/api/grids/00000000-0000-0000-0000-999999999999', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Grid not found' } }),
      });
    });
    await page.goto('/grids/00000000-0000-0000-0000-999999999999');
    await expect(page.getByText('Grid not found')).toBeVisible();
  });
});

// ─── Visual regression screenshots (mocked API for deterministic dates) ─────

test.describe('Grid View — Visual Regression Screenshots', () => {
  test('landing page grid list', async ({ page }) => {
    await mockDashboardList(page);
    await page.goto('/');
    await expect(page.getByText('Audition Prep — Week 1')).toBeVisible();
    await expect(page).toHaveScreenshot('landing-page-grid-list.png');
  });

  test('grid detail with freshness states', async ({ page }) => {
    await mockGridDetail(page);
    await page.goto(`/grids/${TEST_GRID_ID}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Audition Prep');
    // Cells should show fixed dates (3-15) not today's date
    await expect(page.getByRole('button', { name: /Undo step 1, completed 3-15/ })).toBeVisible();
    await expect(page).toHaveScreenshot('grid-detail-freshness-states.png');
  });

  test('grid detail fade disabled', async ({ page }) => {
    await mockGridDetail(page, MOCK_GRID_FADE_OFF);
    await page.goto(`/grids/${TEST_GRID_ID}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Audition Prep');
    await expect(page).toHaveScreenshot('grid-detail-fade-disabled.png');
  });

  test('grid detail fade enabled', async ({ page }) => {
    await mockGridDetail(page);
    await page.goto(`/grids/${TEST_GRID_ID}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Audition Prep');
    await expect(page).toHaveScreenshot('grid-detail-fade-enabled.png');
  });
});
