import { test, expect } from './fixtures.js';
import { cleanupAccountByUsername, createLocalTelegramBotToken, uniqueSuffix } from './utils.js';

test.describe('Models', () => {
  test('should create and remove an account', async ({ page, request }) => {
    const suffix = uniqueSuffix();
    const bot = await createLocalTelegramBotToken(request);
    const accountName = `E2E Test Account ${suffix}`;
    const accountUsername = bot.username;

    try {
      await page.goto('/models');
      await expect(page.getByRole('heading', { name: 'Models' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible();

      await page.getByRole('button', { name: 'Add account' }).click();
      await expect(page.getByRole('heading', { name: 'Add New Account' })).toBeVisible();

      await page.getByPlaceholder('Enter name').fill(accountName);
      await page.getByPlaceholder('Enter username').fill(accountUsername);
      await page.getByPlaceholder('Enter token').fill(bot.token);
      await page.getByPlaceholder('Enter account description').fill('A test account for E2E testing');

      await page.getByRole('button', { name: 'Save Account' }).click();
      await expect(page.getByRole('heading', { name: 'Add New Account' })).toBeHidden({ timeout: 15000 });

      const acctItem = page.locator('.list-item').filter({ hasText: accountUsername }).first();
      await expect(acctItem).toBeVisible();

      await acctItem.getByRole('button', { name: 'Options' }).click();
      await page.getByText('Delete', { exact: true }).click();
      await page.getByRole('button', { name: 'OK' }).click();
      await expect(page.locator('.list-item').filter({ hasText: accountUsername })).toHaveCount(0, {
        timeout: 15000,
      });
    } finally {
      await cleanupAccountByUsername(page, accountUsername);
    }
  });
});
