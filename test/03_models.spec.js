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

  test('should edit account details', async ({ page, request }) => {
    const suffix = uniqueSuffix();
    const bot = await createLocalTelegramBotToken(request);
    const accountName = `E2E Edit Account ${suffix}`;
    const updatedName = `${accountName} Updated`;
    const accountUsername = bot.username;
    try {
      await page.goto('/models');
      await page.getByRole('button', { name: 'Add account' }).click();
      await expect(page.getByRole('heading', { name: 'Add New Account' })).toBeVisible();
      await page.getByPlaceholder('Enter name').fill(accountName);
      await page.getByPlaceholder('Enter username').fill(accountUsername);
      await page.getByPlaceholder('Enter token').fill(bot.token);
      await page.getByRole('button', { name: 'Save Account' }).click();
      await expect(page.getByRole('heading', { name: 'Add New Account' })).toBeHidden({ timeout: 15000 });

      const acctItem = page.locator('.list-item').filter({ hasText: accountUsername }).first();
      await acctItem.click();
      const details = page.locator('.dialog-wrapper').filter({
        has: page.getByRole('heading', { name: accountName }),
      });
      await expect(details).toBeVisible();
      await details.getByRole('button', { name: 'Edit' }).click();
      await details.getByPlaceholder('Enter account name').fill(updatedName);
      await details.getByPlaceholder('Enter new token to change').fill(bot.token);
      await details.getByRole('button', { name: 'Save' }).click();
      await expect(page.locator('.dialog-wrapper').getByRole('heading', { name: updatedName })).toBeVisible({
        timeout: 15000,
      });
      await expect(
        page
          .locator('.dialog-wrapper')
          .locator('.list-item')
          .filter({ has: page.getByRole('heading', { name: 'Name', exact: true }) })
          .locator('input')
      ).toHaveValue(updatedName);
    } finally {
      await cleanupAccountByUsername(page, accountUsername);
    }
  });

  test('should fill Matrix, Discord, and WhatsApp account forms', async ({ page }) => {
    await page.goto('/models');
    await page.getByRole('button', { name: 'Add account' }).click();
    const dialog = page.locator('.dialog-wrapper').filter({
      has: page.getByRole('heading', { name: 'Add New Account' }),
    });
    await expect(dialog).toBeVisible();

    await dialog.locator('select').selectOption('matrix');
    await expect(dialog.getByText('Requires an active Pro subscription.')).toBeVisible();
    await expect(dialog.getByPlaceholder('Enter Matrix homeserver URL')).toBeVisible();
    await dialog.getByPlaceholder('Enter name').fill('Matrix Account');
    await dialog.getByPlaceholder('Enter username').fill('@e2e:example.org');
    await dialog.getByPlaceholder('Enter token').fill('matrix-token');
    await dialog.getByPlaceholder('Enter Matrix homeserver URL').fill('https://matrix.example.org');

    await dialog.locator('select').selectOption('discord');
    await expect(dialog.getByPlaceholder('Enter Discord application client ID')).toBeVisible();
    await dialog.getByPlaceholder('Enter Discord application client ID').fill('1234567890');
    await dialog.getByPlaceholder('Enter token').fill('discord-token');

    await dialog.locator('select').selectOption('whatsapp_cloud');
    await expect(dialog.getByPlaceholder('Enter Meta phone_number_id')).toBeVisible();
    await expect(dialog.getByPlaceholder('Enter access token')).toBeVisible();
    await expect(dialog.getByPlaceholder('Meta app secret')).toBeVisible();
    await dialog.getByPlaceholder('Enter Meta phone_number_id').fill('5551112222');
    await dialog.getByPlaceholder('Enter access token').fill('wa-access-token');
    await dialog.getByPlaceholder('Meta app secret').fill('wa-app-secret');

    await page.route('**/api/add_account', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 0,
          data: {
            account_id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            account_username: '5551112222',
            name: 'WhatsApp Account',
            description: '',
            type: 'whatsapp_cloud',
            server: '',
            is_local: false,
          },
        }),
      });
    });
    await dialog.getByPlaceholder('Enter name').fill('WhatsApp Account');
    await dialog.getByRole('button', { name: 'Save Account' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Account' })).toBeHidden({ timeout: 15000 });
  });
});
