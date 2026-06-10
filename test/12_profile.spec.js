import { test, expect } from '@playwright/test';
import { uniqueSuffix } from './utils.js';

test.describe('Profile Page', () => {
  test('should run the Stripe Connect button flow', async ({ page, baseURL }) => {
    let connectStatusCalls = 0;

    await page.route('**/api/stripe/connect/status', async route => {
      connectStatusCalls += 1;

      const connected = connectStatusCalls > 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: connected
            ? {
                connected: true,
                account_id: 'acct_test_connected',
                details_submitted: true,
                charges_enabled: true,
                payouts_enabled: true,
              }
            : {
                connected: false,
              },
        }),
      });
    });

    await page.route('**/api/stripe/connect/onboarding_link', async route => {
      const body = route.request().postDataJSON();
      expect(body.return_url).toContain('/profile');
      expect(body.refresh_url).toContain('/profile');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: {
            url: `${baseURL}/profile?stripe_connect_return=1`,
            account_id: 'acct_test_connected',
          },
        }),
      });
    });

    await page.goto('/profile');

    await expect(page.getByText('Not connected')).toBeVisible();
    await page.getByRole('button', { name: 'Connect' }).click();

    await expect(page).toHaveURL(/\/profile\?stripe_connect_return=1/);
    await expect(page.getByText('Connected · Payouts enabled')).toBeVisible();
  });

  test('should view and edit profile', async ({ page }) => {
    const suffix = uniqueSuffix();
    const updatedName = `Updated Name ${suffix}`;
    const updatedDescription = `Updated Description ${suffix}`;

    await page.goto('/profile');
    
    await expect(page.getByRole('heading', { name: 'My Information' })).toBeVisible();
    const fullNameInput = page.locator('.list-item').filter({ hasText: 'Full Name' }).locator('input');
    const descriptionInput = page.locator('#profileDescription');
    await expect(fullNameInput).toBeVisible();
    await expect(descriptionInput).toBeVisible();
    
    // 2. Click Edit button
    await page.getByRole('button', { name: 'Edit' }).click();

    // 3. Edit profile
    await fullNameInput.fill(updatedName);
    await descriptionInput.fill(updatedDescription);

    // 4. Save
    await page.getByRole('button', { name: 'Save' }).click();

    // 5. Verify update
    await expect(fullNameInput).toHaveValue(updatedName);
    await expect(descriptionInput).toHaveValue(updatedDescription);
  });

  test('should display links to other pages', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('link', { name: 'My Prototypes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Credits' })).toBeVisible();
  });

  test('should sign out and redirect to signin', async ({ page }) => {
    await page.goto('/profile');
    await page.route('**/api/sign_out', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: 0 }),
      });
    });
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL(/\/signin/);
  });
});
