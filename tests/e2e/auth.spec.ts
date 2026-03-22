import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('sign-in page renders with Google button', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page.getByText('Tessitura')).toBeVisible();
    await expect(page.getByText('Sign in with Google')).toBeVisible();
  });

  test('sign-in page shows error message for OAuthAccountNotLinked', async ({ page }) => {
    await page.goto('/auth/signin?error=OAuthAccountNotLinked');
    await expect(page.getByText(/already associated/)).toBeVisible();
  });

  test('sign-in page shows generic error message', async ({ page }) => {
    await page.goto('/auth/signin?error=SomeOtherError');
    await expect(page.getByText(/error occurred/)).toBeVisible();
  });
});
