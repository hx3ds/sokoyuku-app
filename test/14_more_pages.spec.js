import { test, expect } from '@playwright/test';

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

});
