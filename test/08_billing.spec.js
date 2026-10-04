import { test, expect } from './fixtures.js';

test.describe('Billing', () => {
  test('should show subscriptions page', async ({ page }) => {
    await page.goto('/my-subscriptions');
    await expect(page).toHaveURL(/\/my-subscriptions/);
    
    // Check headers
    // Use exact match or specific role to avoid strict mode violation
    await expect(page.getByRole('heading', { name: 'Platform Subscription' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Model access' })).toBeVisible();
    
    // Check empty state
    await expect(page.getByText('No active platform subscription')).toBeVisible();
  });
});
