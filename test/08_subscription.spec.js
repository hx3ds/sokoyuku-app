import { test, expect } from './fixtures.js';

test.describe('Subscription Page', () => {
  test('should display and manage subscriptions', async ({ page }) => {
    let platformSub = {
      status: 'active',
      plan: { name: 'Pro Plan', description: 'Best plan', price: 2000, interval: 'month' },
      current_period_end: new Date().toISOString(),
      cancel_at_period_end: false
    };

    let modelSubs = [
      {
        model_id: 'model_123',
        status: 'active',
        subscription_tier: 'pro',
        period: new Date().toISOString(),
        prototype: {
          name: 'Cool Model',
          description: 'Very cool',
          billing_interval: 'monthly',
          interval_charge: 500
        }
      }
    ];

    // Mock fetch_all_subscriptions
    await page.route('**/api/get_all_subscriptions', async route => {
      console.log('Mock hit: get_all_subscriptions', JSON.stringify(platformSub));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: { platform: platformSub, models: modelSubs }
        })
      });
    });

    const portalFlows = [];
    await page.route('**/api/create_platform_billing_portal', async route => {
      const body = route.request().postDataJSON();
      portalFlows.push(body.flow);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: { url: 'https://billing.stripe.com/p/session/test' },
        }),
      });
    });
    await page.route('https://billing.stripe.com/**', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>stripe portal</body></html>',
    }));

    await page.goto('/my-subscriptions');
    await expect(page.locator('#page-my-subscriptions').getByText('Loading...')).toBeHidden({
      timeout: 15000,
    });

    // Verify Platform Sub
    await expect(page.getByText('Pro Plan')).toBeVisible();
    const platformRow = page.locator('.list-item').filter({ hasText: 'Pro Plan' });
    await expect(platformRow.getByRole('button', { name: 'Manage' })).toBeVisible();
    await expect(platformRow.getByRole('button', { name: 'Cancel Subscription' })).toHaveCount(0);
    await expect(platformRow.getByRole('button', { name: 'Manage billing' })).toHaveCount(0);

    // Verify Model Sub
    await expect(page.getByText('Cool Model')).toBeVisible();
    const modelRow = page.locator('.list-item').filter({ hasText: 'Cool Model' });
    await expect(modelRow.getByRole('button', { name: 'Manage' })).toHaveCount(0);

    await platformRow.getByRole('button', { name: 'Manage' }).click();
    await expect.poll(() => portalFlows).toEqual(['manage']);
    await expect(page).toHaveURL(/billing\.stripe\.com/);
  });
});
