import { test, expect } from '@playwright/test';
import { clickAppNav, isWideDesktop } from './utils.js';

test.describe('Navigation', () => {
  test('should navigate to Explore page', async ({ page }) => {
    await page.goto('/models');
    await expect(page.getByRole('heading', { name: 'Models' })).toBeVisible();

    await clickAppNav(page, '/explore');
    await expect(page).toHaveURL(/\/explore/);
  });

  test('should navigate to Profile page', async ({ page }) => {
    await page.goto('/models');
    await expect(page.getByRole('heading', { name: 'Models' })).toBeVisible();

    await clickAppNav(page, '/profile');
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByText('My Information')).toBeVisible();
  });

  test('should show overview in the desktop right sidebar', async ({ page }) => {
    test.skip(!isWideDesktop(page), 'Right sidebar only renders at >=1280px');

    await page.goto('/models', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.right-sidebar')).toContainText('Overview');
    await expect(page.locator('.right-sidebar')).toContainText('Sokoyuku Subscription');
    await expect(page.locator('.right-sidebar')).toContainText('Resource Usage');
    await expect(page.locator('.right-sidebar')).toContainText('Account Usage');
  });
  
  test('should show user balance/credits', async ({ page }) => {
    await page.goto('/credits');
    await expect(page).toHaveURL(/\/credits/);
    await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible({ timeout: 15000 });
  });
});
