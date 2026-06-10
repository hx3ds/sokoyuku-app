import { test, expect } from '@playwright/test';

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
    
    // Expect redirection to mock stripe URL
    // We can check if the page url changes to the mocked one, but since it's a full redirect (window.location.href),
    // Playwright might wait for load.
    // The mocked URL is on localhost:8880/mock_stripe_checkout, which doesn't exist, so it might 404.
    // That's fine, we just want to know it tried to go there.
    await expect(page).toHaveURL(/mock_stripe_checkout/);
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
