import { test, expect } from './fixtures.js';
import {
  addToMyModels,
  cleanupAccountByUsername,
  cleanupModelByName,
  cleanupPrototypeByName,
  createLocalTelegramBotToken,
  uniqueSuffix,
} from './utils.js';

test.describe('Chat Flow', () => {
  const suffix = uniqueSuffix();
  const accountName = `E2E Chat Account ${suffix}`;
  let accountUsername = null;
  const protoName = `Chat Prototype ${suffix}`;

  test('should create account, add model, and start chat', async ({ page, request }) => {
    test.setTimeout(60000);

    const bot = await createLocalTelegramBotToken(request);
    accountUsername = bot.username;

    try {
      await page.goto('/models');
      await expect(page).toHaveURL(/\/models/);
      await page.getByRole('button', { name: 'Add account' }).click();
      await page.getByPlaceholder('Enter name').fill(accountName);
      await page.getByPlaceholder('Enter username').fill(accountUsername);
      await page.getByPlaceholder('Enter token').fill(bot.token);
      await page.getByPlaceholder('Enter account description').fill('Chat test account');
      await page.getByRole('button', { name: 'Save Account' }).click();
      await expect(page.getByRole('heading', { name: 'Add New Account' })).toBeHidden({ timeout: 15000 });
      await expect(page.getByText(accountUsername)).toBeVisible();

      await page.goto('/my-prototypes');
      await page.locator('#page-my-prototypes').getByRole('button', { name: 'Create Prototype' }).click();
      await page.getByPlaceholder('e.g. my-awesome-account').fill(protoName);
      await page.getByPlaceholder('e.g. https://example.com').fill('https://tgbd.sokoyuku.com');
      await page.getByPlaceholder('e.g. /my-account').fill('prototypes.passive');
      await page.locator('.dialog-wrapper').getByRole('button', { name: 'Create Prototype' }).click();
      await expect(page.getByRole('heading', { name: 'Create New Prototype' })).toBeHidden({ timeout: 15000 });

      await page.goto('/explore');
      await page.getByPlaceholder('Search prototypes...').fill(protoName);
      const item = page.locator('.list-item').filter({ hasText: protoName });
      await expect(item).toBeVisible({ timeout: 15000 });
      await addToMyModels(page, item.locator('.actions'));

      await page.goto('/models');
      await expect(page).toHaveURL(/\/models/);
      await expect(page.locator('.list-item').filter({ hasText: protoName }).first()).toBeVisible({
        timeout: 15000,
      });

      const modelItem = page.locator('.list-item').filter({ hasText: protoName }).first();
      await modelItem.scrollIntoViewIfNeeded();

      await expect(modelItem.getByRole('button', { name: 'Open chat' })).toBeVisible({ timeout: 15000 });
      await modelItem.getByRole('button', { name: 'Open chat' }).click();

      await expect(page.getByRole('heading', { name: 'Select Account for Chat' })).toBeVisible();

      await page.evaluate(() => {
        window.__pw_lastOpenedUrl = null;
        window.open = (url) => {
          window.__pw_lastOpenedUrl = url;
          return null;
        };
      });

      await page.getByPlaceholder('Search accounts...').fill(accountUsername);
      await page.getByText(accountName).click();

      await expect(page.getByRole('heading', { name: 'Select Account for Chat' })).toBeHidden({ timeout: 15000 });
      const openedUrl = await page.evaluate(() => window.__pw_lastOpenedUrl);
      expect(openedUrl).toMatch(new RegExp(`^https://t\\.me/${accountUsername}\\?start=`));
    } finally {
      await cleanupModelByName(page, protoName);
      await cleanupPrototypeByName(page, protoName);
      await cleanupAccountByUsername(page, accountUsername);
    }
  });
});
