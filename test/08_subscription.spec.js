import { test, expect } from '@playwright/test';

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
        auto_renew: true,
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

    // Mock cancel_platform_subscription
    await page.route('**/api/cancel_platform_subscription', async route => {
      console.log('Mock hit: cancel_platform_subscription');
      platformSub.cancel_at_period_end = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: 0 })
      });
    });

    // Mock cancel_model_subscription
    await page.route('**/api/cancel_model_subscription', async route => {
      console.log('Mock hit: cancel_model_subscription');
      modelSubs[0].auto_renew = false;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: 0 })
      });
    });

    await page.goto('/my-subscriptions');
    await expect(page.getByText('Loading...')).toBeHidden();

    // Verify Platform Sub
    await expect(page.getByText('Pro Plan')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel Subscription' })).toBeVisible();

    // Verify Model Sub
    await expect(page.getByText('Cool Model')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel Auto-renew' })).toBeVisible();

    // Cancel Platform
    // page.on('dialog', dialog => dialog.accept()); // Not needed for custom modal
    
    // We wait for the cancel request and the subsequent fetch request
    const cancelPromise = page.waitForResponse(resp => resp.url().includes('/api/cancel_platform_subscription'));
    const fetchPromise = page.waitForResponse(resp => resp.url().includes('/api/get_all_subscriptions'));
    
    await page.getByRole('button', { name: 'Cancel Subscription' }).click();
    await expect(page.getByText('Are you sure you want to cancel your platform subscription?')).toBeVisible();
    await page.getByRole('button', { name: 'OK' }).click();
    
    await cancelPromise;
    await fetchPromise;
    
    // Verify update
    await expect(page.getByRole('button', { name: 'Cancel Subscription' })).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('Cancels at end of period')).toBeVisible({ timeout: 10000 });

    // Cancel Model
    const cancelModelPromise = page.waitForResponse(resp => resp.url().includes('/api/cancel_model_subscription'));
    const fetchModelPromise = page.waitForResponse(resp => resp.url().includes('/api/get_all_subscriptions'));

    await page.getByRole('button', { name: 'Cancel Auto-renew' }).click();
    await expect(page.getByText('Are you sure you want to cancel this model subscription?')).toBeVisible();
    await page.getByRole('button', { name: 'OK' }).click();
    
    await cancelModelPromise;
    await fetchModelPromise;
    
    // Verify update
    await expect(page.getByText('Auto-renew disabled')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel Auto-renew' })).toBeHidden();
  });
});
