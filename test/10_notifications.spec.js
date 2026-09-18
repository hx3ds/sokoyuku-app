import { test, expect } from './fixtures.js';

test.describe('Notifications', () => {
  test('should show notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/notifications/);
    
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    const empty = page.locator('.not-found-text', { hasText: 'No notifications' });
    const items = page.locator('#page-notifications .list-item');
    await expect.poll(async () => (await empty.count()) + (await items.count())).toBeGreaterThan(0);
  });

  test('should render notification items', async ({ page }) => {
    await page.route('**/api/get_notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: [
            {
              content: 'E2E notification body',
              type: 'success',
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    });
    await page.goto('/notifications');
    await expect(page.locator('#page-notifications .list-item').filter({ hasText: 'E2E notification body' })).toBeVisible();
  });
});
