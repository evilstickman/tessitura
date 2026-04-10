import { test, expect, type Page } from '@playwright/test';

// All dashboard E2E tests mock the API via page.route() rather than relying on
// seed data in the running dev server. This keeps them:
//   - deterministic across runs (no dependency on live DB state)
//   - runnable against any environment (no "is the seed loaded?" ambiguity)
//   - consistent with the visual regression pattern already in this file

const MOCK_DASHBOARD_RESPONSE = [
  {
    id: 'g1', name: 'Audition Prep — Week 1', notes: 'Focus on excerpts', fadeEnabled: true,
    completionPercentage: 60, updatedAt: '2026-03-15T00:00:00.000Z', createdAt: '2026-03-10T00:00:00.000Z',
    freshnessSummary: { fresh: 3, aging: 1, stale: 2, decayed: 1, incomplete: 3 },
    rows: [
      { id: 'r1', piece: { title: 'Clarke #3', composer: 'Clarke' }, passageLabel: null,
        startMeasure: 1, endMeasure: 16, priority: 'HIGH',
        completionPercentage: 60, freshnessSummary: { fresh: 3, aging: 0, stale: 1, decayed: 1, incomplete: 0 } },
      { id: 'r2', piece: { title: 'Firebird', composer: 'Stravinsky' }, passageLabel: 'Infernal Dance',
        startMeasure: 1, endMeasure: 8, priority: 'CRITICAL',
        completionPercentage: 20, freshnessSummary: { fresh: 0, aging: 1, stale: 1, decayed: 0, incomplete: 3 } },
    ],
  },
];

async function mockDashboardApi(page: Page, data = MOCK_DASHBOARD_RESPONSE) {
  await page.route('**/api/grids?detail=true', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.route('**/api/grids', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data.map((g) => ({ id: g.id, name: g.name }))),
    });
  });
}

// ─── Functional tests (mocked API — deterministic) ──────────────────────────

test.describe('Dashboard', () => {
  test('loads and shows all four panes', async ({ page }) => {
    await mockDashboardApi(page);
    await page.goto('/');
    await expect(page.getByText(/Welcome back/)).toBeVisible();
    await expect(page.getByText('MY GRIDS')).toBeVisible();
    await expect(page.getByText('STATISTICS')).toBeVisible();
    await expect(page.getByText('PRACTICE FOCUS')).toBeVisible();
  });

  test('grid list navigates to grid detail', async ({ page }) => {
    await mockDashboardApi(page);
    await page.goto('/');
    await expect(page.getByText('Audition Prep — Week 1')).toBeVisible();
    // Navigation is tested in grid-view.spec.ts; here we verify the click target exists.
    await expect(page.getByText('Audition Prep — Week 1')).toHaveCount(1);
  });

  test('/grids page shows full grid list', async ({ page }) => {
    await mockDashboardApi(page);
    await page.goto('/grids');
    await expect(page.getByText('All Grids')).toBeVisible();
  });
});

// ─── Keyboard accessibility ─────────────────────────────────────────────────

test.describe('Dashboard — Keyboard Accessibility', () => {
  test('Tab navigates through interactive elements with visible focus', async ({ page }) => {
    await mockDashboardApi(page);
    await page.goto('/');
    await expect(page.getByText('+ New Grid')).toBeVisible();

    // Tab to "New Grid" button and verify it receives focus
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.textContent);
      if (focused?.includes('New Grid')) break;
    }
    const focusedText = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedText).toContain('New Grid');

    // Verify focus is visually distinguishable
    const outlineStyle = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return '';
      return window.getComputedStyle(el).outlineStyle;
    });
    expect(outlineStyle).not.toBe('none');
  });
});

// ─── Visual regression (mocked API for deterministic dates) ─────────────────

test.describe('Dashboard — Visual Regression', () => {
  test('dashboard with data', async ({ page }) => {
    await mockDashboardApi(page);
    await page.goto('/');
    await expect(page.getByText(/Welcome back/)).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-with-data.png');
  });

  test('dashboard empty state', async ({ page }) => {
    await mockDashboardApi(page, []);
    await page.goto('/');
    await expect(page.getByText(/Create your first practice grid/)).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-empty-state.png');
  });
});
