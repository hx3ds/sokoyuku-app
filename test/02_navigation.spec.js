import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  // Uses storageState from auth.setup.js automatically
  test('should navigate to Explore page', async ({ page }) => {
    await page.goto('/models'); // Default landing
    await expect(page.getByRole('heading', { name: 'Models' })).toBeVisible();
    
    // Find sidebar link 'Explore'
    // Use .sidebar-link class to be specific or verify url
    await page.locator('.sidebar-link[href="/explore"]').click();
    await expect(page).toHaveURL(/\/explore/);
  });

  test('should navigate to Profile page', async ({ page }) => {
    await page.goto('/models');
    await expect(page.getByRole('heading', { name: 'Models' })).toBeVisible();
    await page.locator('.sidebar-link[href="/profile"]').click();
    await expect(page).toHaveURL(/\/profile/);
    // Check for profile elements
    await expect(page.getByText('My Information')).toBeVisible();
  });

  test('should show overview in the desktop right sidebar', async ({ page }) => {
    await page.goto('/models', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.right-sidebar')).toContainText('Overview');
    await expect(page.locator('.right-sidebar')).toContainText('Sokoyuku Subscription');
    await expect(page.locator('.right-sidebar')).toContainText('Resource Usage');
    await expect(page.locator('.right-sidebar')).toContainText('Account Usage');
  });
  
  test('should show user balance/credits', async ({ page }) => {
    await page.goto('/credits');
    await expect(page).toHaveURL(/\/credits/);
    await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible();
  });
});
