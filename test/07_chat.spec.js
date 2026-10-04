import { test, expect } from './fixtures.js';
import {
  addToMyModels,
  addAccountButton,
  cleanupAccountByUsername,
  cleanupModelByName,
  cleanupPrototypeByName,
  createLocalTelegramBotToken,
  uniqueSuffix,
} from './utils.js';

async function startChat(page, request, { blockPopup }) {
  const suffix = uniqueSuffix();
  const accountName = `E2E Chat Account ${suffix}`;
  const protoName = `Chat Prototype ${suffix}`;
  const bot = await createLocalTelegramBotToken(request);
  const accountUsername = bot.username;

  try {
    await page.goto('/models');
    await expect(page).toHaveURL(/\/models/);
    await addAccountButton(page).click();
    await page.getByPlaceholder('Enter name').fill(accountName);
    await page.getByPlaceholder('Enter bot username').fill(accountUsername);
    await page.getByPlaceholder('Enter bot token').fill(bot.token);
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

    await page.evaluate((blocked) => {
      window.__pw_openUrls = [];
      window.__pw_chatPopup = {
        closed: false,
        location: { href: 'about:blank' },
        close() { this.closed = true; },
      };
      window.open = (url) => {
        window.__pw_openUrls.push(url);
        return blocked ? null : window.__pw_chatPopup;
      };
    }, blockPopup);

    await page.getByPlaceholder('Search accounts...').fill(accountUsername);
    const subscribeWait = page.waitForResponse(
      (res) => res.url().includes('/api/create_model_payment_checkout') && res.request().method() === 'POST'
    );
    await page.getByText(accountName).click();
    await expect(page.getByText('This model is not subscribed yet')).toBeVisible();
    await page.getByRole('button', { name: 'Subscribe' }).click();
    expect((await (await subscribeWait).json()).result).toBe(0);

    await expect(page.getByRole('heading', { name: 'Select Account for Chat' })).toBeHidden({ timeout: 15000 });

    const openUrls = await page.evaluate(() => window.__pw_openUrls);
    expect(openUrls.length).toBeGreaterThan(0);
    expect(openUrls.every((url) => url === 'about:blank')).toBe(true);

    const linkPattern = new RegExp(`^https://t\\.me/${accountUsername}\\?start=`);
    if (blockPopup) {
      const dialog = page.locator('.dialog-wrapper').filter({
        has: page.getByText('The browser blocked the chat window. Open this link.'),
      });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('a')).toHaveAttribute('href', linkPattern);
    } else {
      await expect(page.getByText('The browser blocked the chat window. Open this link.')).toHaveCount(0);
      const openedUrl = await page.evaluate(() => window.__pw_chatPopup.location.href);
      expect(openedUrl).toMatch(linkPattern);
      const closed = await page.evaluate(() => window.__pw_chatPopup.closed);
      expect(closed).toBe(false);
    }
  } finally {
    await cleanupModelByName(page, protoName);
    await cleanupPrototypeByName(page, protoName);
    await cleanupAccountByUsername(page, accountUsername);
  }
}

test.describe('Chat Flow', () => {
  test('should create account, add model, and start chat', async ({ page, request }) => {
    test.setTimeout(60000);
    await startChat(page, request, { blockPopup: false });
  });

  test('should show the chat link when the popup is blocked', async ({ page, request }) => {
    test.setTimeout(60000);
    await startChat(page, request, { blockPopup: true });
  });
});
