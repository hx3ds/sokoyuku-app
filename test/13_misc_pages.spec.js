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
              description: 'Credits added',
              status: 'success',
              amount: 10,
              transaction_type: 'credit',
              created_at: new Date().toISOString(),
            },
            {
              description: 'Card declined',
              status: 'failed',
              amount: -12,
              transaction_type: 'debit',
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    });
    await page.goto('/payment-history');
    await expect(page.locator('.list-item').filter({ hasText: 'Credits added' })).toBeVisible();
    await expect(page.locator('.list-item').filter({ hasText: 'Card declined' })).toBeVisible();
    await expect(page.locator('.list-item').filter({ hasText: 'Card declined' })).toContainText('$12.00');
  });

  test('should display Payout Details page', async ({ page }) => {
    await page.goto('/payout-details');
    await expect(page).toHaveURL(/\/payout-details/);
    await expect(page.getByRole('heading', { name: 'Payout Details' })).toBeVisible();
    const empty = page.locator('.not-found-text', { hasText: "You haven't created any prototypes yet." });
    const items = page.locator('#page-payout-details .list-item');
    await expect.poll(async () => (await empty.count()) + (await items.count())).toBeGreaterThan(0);
  });

  test('should drill into payout details for a prototype', async ({ page }) => {
    await page.route('**/api/get_my_prototype_payout_details', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: {
            prototypes: [
              {
                prototype_id: 4242,
                name: 'E2E Payout Proto',
                description: 'payout drill-down',
                payout_details: {
                  has_data: true,
                  summary_by_currency: [
                    {
                      currency: 'usd',
                      event_count: 2,
                      gross_amount: 20,
                      platform_fee_amount: 2,
                      net_amount: 18,
                      paid_net_amount: 10,
                      pending_net_amount: 5,
                      failed_net_amount: 3,
                      paid_event_count: 1,
                      pending_event_count: 1,
                      failed_event_count: 1,
                      last_event_at: new Date().toISOString(),
                    },
                  ],
                  payouts: [
                    {
                      payout_id: 'po_e2e',
                      currency: 'usd',
                      gross_amount: 10,
                      platform_fee_amount: 1,
                      net_amount: 9,
                      event_count: 1,
                      status: 'paid',
                      created_at: new Date().toISOString(),
                      paid_at: new Date().toISOString(),
                    },
                  ],
                  events: [
                    {
                      event_id: 'evt_e2e',
                      source_type: 'subscription',
                      source_id: 'sub_e2e',
                      currency: 'usd',
                      gross_amount: 10,
                      platform_fee_amount: 1,
                      net_amount: 9,
                      status: 'paid',
                      payout_id: 'po_e2e_long',
                      created_at: new Date().toISOString(),
                    },
                  ],
                },
              },
            ],
          },
        }),
      });
    });
    await page.goto('/payout-details');
    await expect(page.getByText('Summary · USD').first()).toBeVisible();
    await expect(page.getByText('Paid payout').first()).toBeVisible();
    await expect(page.getByText('Subscription sub_e2e').first()).toBeVisible();
    await page.getByRole('button', { name: /E2E Payout Proto/ }).click();
    await page.getByText('Open Prototype').click();
    await expect(page).toHaveURL(/\/prototype\/4242/);
  });

});
