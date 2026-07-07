import { test, expect } from '@playwright/test';
import { uniqueSuffix } from './utils.js';

const activePlan = {
  plan_id: '11111111111111111111111111111111',
  name: 'Pro Plan',
  description: 'Sokoyuku pro subscription',
  price: 9.99,
};

test.describe('Profile Page', () => {
  async function mockSokoyukuSubscription(page, subscription = null, plans = [activePlan]) {
    await page.route('**/api/get_platform_subscription', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: subscription,
        }),
      });
    });

    await page.route('**/api/get_subscription_plans', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: plans,
        }),
      });
    });
  }

  test('should run the Stripe Connect button flow', async ({ page, baseURL }) => {
    let connectStatusCalls = 0;
    await mockSokoyukuSubscription(page);
    const stripeConnectInput = page
      .locator('.list-item')
      .filter({ hasText: 'Stripe Connect' })
      .locator('input');

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

    await expect(stripeConnectInput).toHaveValue('Not connected');
    await page.getByRole('button', { name: 'Connect' }).click();

    await expect(page).toHaveURL(/\/profile\?stripe_connect_return=1/);
    await expect(stripeConnectInput).toHaveValue('Connected · Payouts enabled');
  });

  test('should show upgrade action for the free plan and start checkout', async ({ page, baseURL }) => {
    await mockSokoyukuSubscription(page, null);

    await page.route('**/api/create_platform_subscription_checkout', async route => {
      const body = route.request().postDataJSON();
      expect(body.plan_id).toBe(activePlan.plan_id);
      expect(body.success_url).toContain('/profile?subscription_success=1');
      expect(body.cancel_url).toContain('/profile?subscription_cancel=1');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: {
            url: `${baseURL}/profile?subscription_success=1`,
          },
        }),
      });
    });

    await page.goto('/profile');
    await expect(page.locator('#page-profile')).toContainText('Sokoyuku Subscription');
    await expect(
      page.locator('.list-item').filter({ hasText: 'Sokoyuku Subscription' }).locator('input')
    ).toHaveValue('Free');
    await expect(page.getByRole('button', { name: 'Upgrade' })).toBeVisible();

    await page.getByRole('button', { name: 'Upgrade' }).click();
    await expect(page).toHaveURL(/\/profile\?subscription_success=1/);
  });

  test('should show renew action and period when a subscription already exists', async ({ page }) => {
    await mockSokoyukuSubscription(page, {
      status: 'canceled',
      current_period_end: '2026-07-31T00:00:00',
      cancel_at_period_end: true,
      plan: {
        name: 'Pro Plan',
        description: 'Sokoyuku pro subscription',
        price: 9.99,
      },
    });

    await page.goto('/profile');
    await expect(page.locator('#page-profile')).toContainText('Sokoyuku Subscription');
    await expect(
      page.locator('.list-item').filter({ hasText: 'Sokoyuku Subscription' }).locator('input')
    ).toHaveValue('Free');
    await expect(page.getByRole('button', { name: 'Renew' })).toBeVisible();
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
    const myInfoSection = page.locator('.list-section', {
      has: page.getByRole('heading', { name: 'My Information' }),
    });
    await myInfoSection.getByRole('button', { name: 'Edit' }).click();

    // 3. Edit profile
    await fullNameInput.fill(updatedName);
    await descriptionInput.fill(updatedDescription);

    // 4. Save
    await myInfoSection.getByRole('button', { name: 'Save' }).click();

    // 5. Verify update
    await expect(fullNameInput).toHaveValue(updatedName);
    await expect(descriptionInput).toHaveValue(updatedDescription);
  });

  test('should display links to other pages', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    const profilePage = page.locator('#page-profile');
    await expect(profilePage.getByRole('link', { name: /Overview/ })).toBeVisible();
    await expect(profilePage.getByRole('link', { name: 'My Prototypes' })).toBeVisible();
    await expect(profilePage.getByRole('link', { name: 'Notifications' })).toBeVisible();
    await expect(profilePage.getByRole('link', { name: 'Credits' })).toBeVisible();
    await expect(profilePage.getByRole('link', { name: 'Payout Details' })).toBeVisible();
  });

  test('should open overview from profile', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await page.locator('#page-profile').getByRole('link', { name: /Overview/ }).click();
    await expect(page).toHaveURL(/\/overview/);
    await expect(page.getByRole('heading', { name: 'Sokoyuku Subscription' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Resource Usage' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Account Usage' })).toBeVisible();
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
