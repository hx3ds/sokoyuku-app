import { test, expect } from '@playwright/test';

test.describe('Miscellaneous Pages', () => {
  
  test('should display My Prototypes page', async ({ page }) => {
    await page.goto('/my-prototypes');
    await expect(page).toHaveURL(/\/my-prototypes/);
    
    // Check Title
    await expect(page.getByText('My Prototypes')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Prototype' })).toBeVisible();
  });

  test('should display Payment History page', async ({ page }) => {
    await page.goto('/payment-history');
    await expect(page).toHaveURL(/\/payment-history/);
    
    // Check Title
    await expect(page.getByRole('heading', { name: 'Transaction History' })).toBeVisible();
    const empty = page.locator('.not-found-text', { hasText: 'No transaction history' });
    const items = page.locator('#page-payment-history .list-item');
    await expect.poll(async () => (await empty.count()) + (await items.count())).toBeGreaterThan(0);
  });

});
