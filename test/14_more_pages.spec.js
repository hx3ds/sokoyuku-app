import { test, expect } from './fixtures.js';

test.describe('More Pages', () => {

  test('should display Credits page', async ({ page }) => {
    await page.goto('/credits');
    await expect(page).toHaveURL(/\/credits/);

    // Check Title
    await expect(page.getByText('Credits', { exact: true })).toBeVisible();

    // Check Balance
    await expect(page.locator('.list-item').filter({ hasText: 'Current Balance' }).locator('input')).toHaveValue(/^\$\d+\.\d{2}$/);

    // Check Add Credits Button
    await expect(page.getByRole('button', { name: 'Add Credits' })).toBeVisible();

    // Check Link to Chat History
    await expect(page.getByText('Chat History')).toBeVisible();
  });

  test('should display Chat History page', async ({ page }) => {
    await page.goto('/chat-history');
    await expect(page).toHaveURL(/\/chat-history/);

    // Check Title
    await expect(page.getByText('Deduction History')).toBeVisible();
    const emptyText = page.getByText('No history found');
    const firstHistoryItem = page.locator('.list-item').first();
    await expect(emptyText.or(firstHistoryItem)).toBeVisible();
  });

  test('should open chat history from credits and show deduction rows', async ({ page }) => {
    await page.route('**/api/get_wallet_deduction_history', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: {
            history: [
              {
                model_name: 'E2E Model',
                prototype_name: 'E2E Proto',
                actual_cost: 1.25,
                reserved_amount: 2,
                status: 'settled',
                created_at: new Date().toISOString(),
              },
            ],
          },
        }),
      });
    });
    await page.goto('/credits');
    await page.getByText('Chat History').click();
    await expect(page).toHaveURL(/\/chat-history/);
    await expect(page.getByText('E2E Model')).toBeVisible();
    await expect(page.getByText('(E2E Proto)')).toBeVisible();
    await expect(page.getByText('-$1.25')).toBeVisible();
  });

});
