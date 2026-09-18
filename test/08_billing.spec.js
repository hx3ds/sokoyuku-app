import { test, expect } from './fixtures.js';

test.describe('Billing & Credits', () => {
  test('should show credits page and allow adding credits', async ({ page }) => {
    // Mock the create_checkout_session API
    await page.route('**/api/create_checkout_session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: {
            url: 'http://localhost:8880/mock_stripe_checkout'
          }
        })
      });
    });

    await page.goto('/credits');
    await expect(page).toHaveURL(/\/credits/);
    
    // Check balance is visible
    await expect(page.getByText('Current Balance')).toBeVisible();
    
    // Open Add Credits Modal
    await page.getByRole('button', { name: 'Add Credits' }).click();
    await expect(page.getByRole('heading', { name: 'Add Credits' })).toBeVisible();
    
    // Select an amount (e.g., $10)
    // The modal uses an input field with id "creditsAmount" and title "Amount (USD)"
    await page.locator('#creditsAmount').fill('10');
    
    // Click Proceed to Checkout
    await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
    
    await expect(page).toHaveURL(/mock_stripe_checkout/);
  });

  test('should show failed checkout error', async ({ page }) => {
    await page.route('**/api/create_checkout_session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 1,
          msg: 'Your card was declined',
        }),
      });
    });

    await page.goto('/credits');
    await page.getByRole('button', { name: 'Add Credits' }).click();
    await expect(page.getByRole('heading', { name: 'Add Credits' })).toBeVisible();
    await page.locator('#creditsAmount').fill('10');
    await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
    await expect(page.getByText('Your card was declined')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add Credits' })).toBeVisible();
  });

  test('should show subscriptions page', async ({ page }) => {
    await page.goto('/my-subscriptions');
    await expect(page).toHaveURL(/\/my-subscriptions/);
    
    // Check headers
    // Use exact match or specific role to avoid strict mode violation
    await expect(page.getByRole('heading', { name: 'Platform Subscription' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Model Subscriptions' })).toBeVisible();
    
    // Check empty state
    await expect(page.getByText('No active platform subscription')).toBeVisible();
  });
});
