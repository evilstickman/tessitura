import { test, expect } from '@playwright/test';

test.describe('Grid View', () => {
  test('landing page shows grid list', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Audition Prep — Week 1')).toBeVisible();
  });

  test('navigate to grid detail page', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Audition Prep — Week 1').click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Audition Prep');
  });

  test('grid shows cells with BPM for incomplete cells', async ({ page }) => {
    await page.goto('/grids/00000000-0000-0000-0000-000000000001');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Audition Prep');
    // First cell should show BPM (48 = round(0.4 * 120))
    await expect(page.getByRole('button', { name: /48 BPM/ })).toBeVisible();
  });

  test('click cell to complete, verify it turns green', async ({ page }) => {
    await page.goto('/grids/00000000-0000-0000-0000-000000000001');
    const cell = page.getByRole('button', { name: /Complete step 1 at 48 BPM/ });
    await cell.click();
    // After completion, the cell should show a date-based aria-label
    await expect(page.getByRole('button', { name: /Undo step 1/ })).toBeVisible();
  });

  test('right-click completed cell to undo', async ({ page }) => {
    await page.goto('/grids/00000000-0000-0000-0000-000000000001');
    // Complete a cell first
    const cell = page.getByRole('button', { name: /Complete step 1 at 48 BPM/ });
    await cell.click();
    await expect(page.getByRole('button', { name: /Undo step 1/ })).toBeVisible();
    // Right-click to undo
    const undoCell = page.getByRole('button', { name: /Undo step 1/ });
    await undoCell.click({ button: 'right' });
    // Should revert to BPM display
    await expect(page.getByRole('button', { name: /Complete step 1 at 48 BPM/ })).toBeVisible();
  });

  test('fade toggle is visible and clickable', async ({ page }) => {
    await page.goto('/grids/00000000-0000-0000-0000-000000000001');
    const fadeToggle = page.getByRole('switch', { name: 'Toggle fade' });
    await expect(fadeToggle).toBeVisible();
    await fadeToggle.click();
    await fadeToggle.click();
  });

  test('helper legend is visible', async ({ page }) => {
    await page.goto('/grids/00000000-0000-0000-0000-000000000001');
    await expect(page.getByText('Click to complete')).toBeVisible();
  });

  test('grid not found shows message', async ({ page }) => {
    await page.goto('/grids/00000000-0000-0000-0000-999999999999');
    await expect(page.getByText('Grid not found')).toBeVisible();
  });
});

test.describe('Grid View — Visual Regression Screenshots', () => {
  test('landing page grid list', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Audition Prep — Week 1')).toBeVisible();
    await expect(page).toHaveScreenshot('landing-page-grid-list.png');
  });

  test('grid detail with freshness states', async ({ page }) => {
    await page.goto('/grids/00000000-0000-0000-0000-000000000001');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Audition Prep');
    // Complete first two cells to create a mix of states
    const cell1 = page.getByRole('button', { name: /Complete step 1/ });
    await cell1.click();
    await expect(page.getByRole('button', { name: /Undo step 1/ })).toBeVisible();
    const cell2 = page.getByRole('button', { name: /Complete step 2/ });
    await cell2.click();
    await expect(page.getByRole('button', { name: /Undo step 2/ })).toBeVisible();
    await expect(page).toHaveScreenshot('grid-detail-freshness-states.png');
  });

  test('grid detail with fade disabled vs enabled', async ({ page }) => {
    await page.goto('/grids/00000000-0000-0000-0000-000000000001');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Audition Prep');
    const fadeToggle = page.getByRole('switch', { name: 'Toggle fade' });
    await fadeToggle.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('grid-detail-fade-disabled.png');
    await fadeToggle.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('grid-detail-fade-enabled.png');
  });
});
