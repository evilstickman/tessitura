import { test, expect } from '@playwright/test';

/**
 * Viewport responsiveness tests for M1.9 V1 Polish.
 * Tests that the dashboard and grid view render without layout breaks
 * at standard viewport widths.
 */

const VIEWPORTS = [
  { name: 'mobile-small', width: 320, height: 568 },
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1024, height: 768 },
  { name: 'desktop-large', width: 1440, height: 900 },
];

for (const vp of VIEWPORTS) {
  test.describe(`Viewport: ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('dashboard renders without horizontal overflow', async ({ page }) => {
      await page.goto('/');
      // Page should not have horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
    });

    test('grid detail renders without horizontal overflow', async ({ page }) => {
      await page.goto('/grids/00000000-0000-0000-0000-000000000001');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // Same no-overflow check as dashboard
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  });
}
