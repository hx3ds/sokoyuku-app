import { test, expect } from './fixtures.js';
import { clickAppNav, isWideDesktop, isMobileViewport } from './utils.js';

test.describe('Navigation', () => {
  test('should show a language picker and switch locales', async ({ page }) => {
    await page.goto('/models');
    await expect(page.getByRole('heading', { name: 'Models' })).toBeVisible({ timeout: 15000 });
    const picker = isMobileViewport(page)
      ? page.locator('.mobile-header select')
      : page.locator('.sidebar-footer select');
    await expect(picker).toBeVisible();
    try {
      await picker.selectOption('jp');
      await expect(page.getByRole('heading', { name: 'モデル' })).toBeVisible();
    } finally {
      await picker.selectOption('en');
    }
    await expect(page.getByRole('heading', { name: 'Models' })).toBeVisible();
  });

  test('should navigate to Explore page', async ({ page }) => {
    await page.goto('/models');
    await expect(page.getByRole('heading', { name: 'Models' })).toBeVisible({ timeout: 15000 });

    await clickAppNav(page, '/explore');
    await expect(page).toHaveURL(/\/explore/);
  });

  test('should navigate to Models page from Explore', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.getByPlaceholder('Search prototypes...')).toBeVisible({ timeout: 15000 });

    await clickAppNav(page, '/models');
    await expect(page).toHaveURL(/\/models/);
    await expect(page.getByRole('heading', { name: 'Models' })).toBeVisible();
  });

  test('should navigate to Profile page', async ({ page }) => {
    await page.goto('/models');
    await expect(page.getByRole('heading', { name: 'Models' })).toBeVisible({ timeout: 15000 });

    await clickAppNav(page, '/profile');
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByText('My Information')).toBeVisible({ timeout: 15000 });
  });

  test('should use the desktop sidebar Models link', async ({ page }) => {
    test.skip(isMobileViewport(page), 'Desktop sidebar is hidden below 768px');
    await page.goto('/explore');
    await expect(page.getByPlaceholder('Search prototypes...')).toBeVisible({ timeout: 15000 });
    const sidebar = page.locator('a.sidebar-link[href="/models"]').filter({ visible: true });
    await expect(sidebar).toHaveCount(1);
    await sidebar.click();
    await expect(page).toHaveURL(/\/models/);
  });

  test('should use the mobile bottom nav', async ({ page }) => {
    test.skip(!isMobileViewport(page), 'Bottom nav only renders below 768px');
    await page.goto('/explore');
    await expect(page.locator('a.bottom-link[href="/models"]').filter({ visible: true })).toHaveCount(1);
    await page.locator('a.bottom-link[href="/models"]').filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/models/);
    await page.locator('a.bottom-link[href="/profile"]').filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/profile/);
    await page.locator('a.bottom-link[href="/explore"]').filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/explore/);
  });

  test('should show overview in the desktop right sidebar', async ({ page }) => {
    test.skip(!isWideDesktop(page), 'Right sidebar only renders at >=1280px');

    await page.goto('/models', { waitUntil: 'domcontentloaded' });
    const sidebar = page.locator('.right-sidebar');
    await expect(sidebar).toContainText('Overview');
    await expect(sidebar).toContainText('Sokoyuku Subscription');
    await expect(sidebar).toContainText('Resource Usage');
    await expect(sidebar).toContainText('Account Usage');
    await expect(sidebar.locator('.overview-section-body').first()).not.toHaveText('Loading...', {
      timeout: 15000,
    });
    await expect(sidebar).toContainText(/Models \d+\/\d+/);
    await expect(sidebar).toContainText(/Prototypes \d+\/\d+/);
    await expect(sidebar).toContainText(/Free \d+\/\d+ normal/);
  });

  test('should go back from 404', async ({ page }) => {
    await page.goto('/models');
    await expect(page.getByRole('heading', { name: 'Models' })).toBeVisible({ timeout: 15000 });
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await page.getByRole('button', { name: 'Go Back' }).click();
    await expect(page).toHaveURL(/\/models/);
  });

  test('should show user balance/credits', async ({ page }) => {
    await page.goto('/credits');
    await expect(page).toHaveURL(/\/credits/);
    await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible({ timeout: 15000 });
  });
});
