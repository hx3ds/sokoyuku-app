import { test, expect } from './fixtures.js';

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

  test('should show payment history rows including a failed payment', async ({ page }) => {
    await page.route('**/api/get_transaction_history', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: [
            {
              description: 'Platform subscription',
              status: 'success',
              amount: 1000,
              transaction_type: 'credit',
              created_at: new Date().toISOString(),
            },
            {
              description: 'Card declined',
              status: 'failed',
              amount: -1200,
              transaction_type: 'debit',
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    });
    await page.goto('/payment-history');
    await expect(page.locator('.list-item').filter({ hasText: 'Platform subscription' })).toBeVisible();
    await expect(page.locator('.list-item').filter({ hasText: 'Card declined' })).toBeVisible();
    await expect(page.locator('.list-item').filter({ hasText: 'Card declined' })).toContainText('$12.00');
  });

  test('should display Payout Details page', async ({ page }) => {
    await page.goto('/payout-details');
    await expect(page).toHaveURL(/\/payout-details/);
    await expect(page.getByRole('heading', { name: 'Payout Details' })).toBeVisible();
    const empty = page.locator('.not-found-text');
    const items = page.locator('#page-payout-details .list-item');
    await expect.poll(async () => (await empty.count()) + (await items.count())).toBeGreaterThan(0);
  });

  test('should say no prototypes when the creator has none', async ({ page }) => {
    await page.route('**/api/get_my_prototype_payout_details', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: 0, data: { prototypes: [] } }),
      });
    });
    await page.route('**/api/stripe/connect/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: 0, data: { connected: true, payouts_enabled: true, tax_ready: true } }),
      });
    });
    await page.goto('/payout-details');
    await expect(page.locator('.not-found-text')).toHaveText('No prototypes');
  });

  test('should say not connected when Stripe Connect is not connected', async ({ page }) => {
    await page.route('**/api/get_my_prototype_payout_details', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: { prototypes: [{ prototype_id: 4242, name: 'E2E Payout Proto' }] },
        }),
      });
    });
    await page.route('**/api/stripe/connect/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: 0, data: { connected: false } }),
      });
    });
    await page.goto('/payout-details');
    await expect(page.locator('.not-found-text')).toHaveText('Not connected');
  });

  test('should say the Connect status when the account is connected', async ({ page }) => {
    await page.route('**/api/get_my_prototype_payout_details', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: { prototypes: [{ prototype_id: 4242, name: 'E2E Payout Proto' }] },
        }),
      });
    });
    await page.route('**/api/stripe/connect/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: { connected: true, payouts_enabled: true, tax_ready: false },
        }),
      });
    });
    await page.goto('/payout-details');
    await expect(page.locator('.not-found-text')).toHaveText('Connected · Payouts enabled · Tax setup needed');
  });

});
