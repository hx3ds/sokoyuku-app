import { test, expect } from '@playwright/test';
import { cleanupAccount } from './db.js';
import { createLocalTelegramBotToken, uniqueSuffix } from './utils.js';

test.describe('Chat Flow', () => {
  const suffix = uniqueSuffix();
  const accountName = `E2E Chat Account ${suffix}`;
  let accountUsername = null;
  const protoName = `Chat Prototype ${suffix}`;
  
  test.afterAll(async () => {
    if (accountUsername) {
      await cleanupAccount(accountUsername);
    }
  });

  test('should create account, add model, and start chat', async ({ page, request }) => {
    test.setTimeout(60000);

    const bot = await createLocalTelegramBotToken(request);
    accountUsername = bot.username;

    // 1. Create Account
    await page.goto('/models');
    await expect(page).toHaveURL(/\/models/);
    await page.getByRole('button', { name: 'Add account' }).click();
    await page.getByPlaceholder('Enter name').fill(accountName);
    await page.getByPlaceholder('Enter username').fill(accountUsername);
    await page.getByPlaceholder('Enter token').fill(bot.token);
    await page.getByPlaceholder('Enter account description').fill('Chat test account');
    await page.getByRole('button', { name: 'Save Account' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Account' })).toBeHidden();
    await expect(page.getByText(`@${accountUsername}`)).toBeVisible();
    
    // 2. Create Prototype
    await page.goto('/my-prototypes');
    await page.locator('#page-my-prototypes').getByRole('button', { name: 'Create Prototype' }).click();
    await page.getByPlaceholder('e.g. my-awesome-account').fill(protoName);
    await page.getByPlaceholder('e.g. https://example.com').fill('https://tgbd.sokoyuku.com');
    await page.getByPlaceholder('e.g. /my-account').fill('prototypes.passive');
    await page.locator('.dialog-wrapper').getByRole('button', { name: 'Create Prototype' }).click();
    await expect(page.getByRole('heading', { name: 'Create New Prototype' })).toBeHidden({ timeout: 15000 });
    
    // 3. Add to Models
    await page.goto('/explore');
    await page.getByPlaceholder('Search prototypes...').fill(protoName);
    const item = page.locator('.list-item').filter({ hasText: protoName });
    await item.locator('.actions').getByRole('button', { name: 'Add to my models' }).click();
    
    // 4. Go to Models and Start Chat
    await page.goto('/models');
    await expect(page).toHaveURL(/\/models/);
    await expect
      .poll(
        async () => {
          const count = await page.locator('.list-item').filter({ hasText: protoName }).count();
          if (count === 0) {
            await page.reload();
          }
          return count;
        },
        { timeout: 30000 }
      )
      .toBeGreaterThan(0);

    const modelItem = page.locator('.list-item').filter({ hasText: protoName }).first();
    await modelItem.scrollIntoViewIfNeeded();
    
    // Click Open Chat (first button in actions)
    await expect(modelItem.getByRole('button', { name: 'Open chat' })).toBeVisible({ timeout: 15000 });
    await modelItem.getByRole('button', { name: 'Open chat' }).click();
    
    // Verify Account Select Modal
    await expect(page.getByRole('heading', { name: 'Select Account for Chat' })).toBeVisible();
    
    await page.evaluate(() => {
      window.__pw_lastOpenedUrl = null;
      window.open = (url) => {
        window.__pw_lastOpenedUrl = url;
        return null;
      };
    });

    // Select our account and capture the URL opened by window.open
    await page.getByPlaceholder('Search accounts...').fill(accountUsername);
    await page.getByText(accountName).click();
    
    // 5. Cleanup Model
    await expect(page.getByRole('heading', { name: 'Select Account for Chat' })).toBeHidden({ timeout: 15000 });
    const openedUrl = await page.evaluate(() => window.__pw_lastOpenedUrl);
    expect(openedUrl).toMatch(new RegExp(`^https://t\\.me/${accountUsername}\\?start=`));
    
    // Delete model
    await modelItem.getByRole('button', { name: 'Options' }).click();
    await page.getByText('Delete').click();
    await page.getByRole('button', { name: 'OK' }).click();
    await page.reload();
    await expect(page.locator('.list-item').filter({ hasText: protoName })).toHaveCount(0);

    // Delete prototype
    await page.goto('/my-prototypes');
    const protoItem = page.locator('.list-item').filter({ hasText: protoName }).first();
    await protoItem.getByRole('button', { name: 'Options' }).click();
    await page.getByText('Delete').click();
    await page.getByRole('button', { name: 'OK' }).click();
    await page.reload();
    await expect(page.locator('.list-item').filter({ hasText: protoName })).toHaveCount(0);

    // Delete account
    await page.goto('/models');
    const acctItem = page.locator('.list-item').filter({ hasText: `@${accountUsername}` }).first();
    if (await acctItem.count() === 0) {
      const accountsSection = page.getByRole('button', { name: 'Accounts' });
      await accountsSection.click();
    }
    await expect(acctItem).toBeVisible({ timeout: 15000 });
    await acctItem.getByRole('button', { name: 'Options' }).click();
    await page.getByText('Delete').click();
    await page.getByRole('button', { name: 'OK' }).click();
  });
});
