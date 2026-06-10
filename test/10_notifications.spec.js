import { test, expect } from '@playwright/test';

test.describe('Notifications', () => {
  test('should show notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/notifications/);
    
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    const empty = page.locator('.not-found-text', { hasText: 'No notifications' });
    const items = page.locator('#page-notifications .list-item');
    await expect.poll(async () => (await empty.count()) + (await items.count())).toBeGreaterThan(0);
  });
});
