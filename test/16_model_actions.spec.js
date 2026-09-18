import { test, expect } from './fixtures.js';
import {
  addToMyModels,
  cleanupAccountByUsername,
  cleanupModelByName,
  cleanupPrototypeByName,
  createLocalTelegramBotToken,
  createRemotePrototypeViaUi,
  mockClipboard,
  uniqueSuffix,
} from './utils.js';

async function patchModelList(page, patchFn) {
  await page.route('**/api/get_user_model_list', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const res = await route.fetch();
    const body = await res.json();
    if (body?.result === 0 && Array.isArray(body?.data?.models)) {
      body.data.models = patchFn(body.data.models);
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

async function openModelOptions(page, name) {
  await page.goto('/models');
  const item = page.locator('.list-item').filter({ hasText: name }).first();
  await expect(item).toBeVisible({ timeout: 15000 });
  await item.getByRole('button', { name: 'Options' }).click();
  return item;
}

test.describe('Model actions', () => {
  test('should share a model via account select, clipboard, and OTP', async ({ page, request }) => {
    test.setTimeout(90000);
    const suffix = uniqueSuffix();
    const protoName = `E2E Share ${suffix}`;
    const bots = [await createLocalTelegramBotToken(request), await createLocalTelegramBotToken(request)];
    const usernames = bots.map((bot) => bot.username);
    try {
      await mockClipboard(page);
      await createRemotePrototypeViaUi(page, { name: protoName });
      await page.goto('/explore');
      await page.getByPlaceholder('Search prototypes...').fill(protoName);
      const exploreItem = page.locator('.list-item').filter({ hasText: protoName }).first();
      await expect(exploreItem).toBeVisible({ timeout: 15000 });
      await addToMyModels(page, exploreItem.locator('.actions'));

      await page.goto('/models');
      for (let i = 0; i < bots.length; i++) {
        await page.getByRole('button', { name: 'Add account' }).click();
        await expect(page.getByRole('heading', { name: 'Add New Account' })).toBeVisible();
        await page.getByPlaceholder('Enter name').fill(`Share Account ${suffix} ${i}`);
        await page.getByPlaceholder('Enter username').fill(bots[i].username);
        await page.getByPlaceholder('Enter token').fill(bots[i].token);
        await page.getByRole('button', { name: 'Save Account' }).click();
        await expect(page.getByRole('heading', { name: 'Add New Account' })).toBeHidden({ timeout: 15000 });
      }

      const accountsRes = await page.request.post('http://localhost:9000/api/get_user_account_list', {
        data: {},
      });
      const accountsBody = await accountsRes.json();
      const accounts = (accountsBody?.data?.accounts || []).filter((account) =>
        usernames.includes(account.account_username)
      );
      expect(accounts.length).toBe(2);

      await patchModelList(page, (models) =>
        models.map((model) => {
          if (model.name !== protoName) return model;
          return {
            ...model,
            accts: accounts.map((account) => ({
              acct_id: account.account_id,
              acct_username: account.account_username,
              acct_type: account.type || 'telegram',
              server: account.server || '',
              account_group: account.account_group || 'free',
              subscription_disabled: false,
              is_last_used: false,
            })),
          };
        })
      );

      await page.route('**/api/request_otp_for_chat', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: 0,
            data: { otp: '654321', link: 'https://t.me/sharebot?start=e2e' },
          }),
        });
      });

      await openModelOptions(page, protoName);
      await page.getByRole('button', { name: 'Share' }).click();
      const select = page.locator('.dialog-wrapper').filter({
        has: page.getByRole('heading', { name: 'Select Account to Share' }),
      });
      await expect(select).toBeVisible();
      await select.locator('.list-item').filter({ hasText: usernames[0] }).click();
      await expect(page.getByText('Link copied!')).toBeVisible();
      await expect.poll(async () => page.evaluate(() => window.__pwClipboard)).toContain('https://t.me/sharebot');
    } finally {
      for (const username of usernames) {
        await cleanupAccountByUsername(page, username);
      }
      await cleanupModelByName(page, protoName);
      await cleanupPrototypeByName(page, protoName);
    }
  });

  test('should manage and delete a model chat', async ({ page }) => {
    const protoName = `E2E Chats ${uniqueSuffix()}`;
    try {
      await createRemotePrototypeViaUi(page, { name: protoName });
      await page.goto('/explore');
      await page.getByPlaceholder('Search prototypes...').fill(protoName);
      const exploreItem = page.locator('.list-item').filter({ hasText: protoName }).first();
      await expect(exploreItem).toBeVisible({ timeout: 15000 });
      await addToMyModels(page, exploreItem.locator('.actions'));

      let chats = [
        {
          chat_id: 'chat-e2e-1',
          account_id: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          chat_type: 'private',
          created_at: new Date().toISOString(),
        },
      ];
      await page.route('**/api/get_model_chats', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ result: 0, data: { chats } }),
        });
      });
      await page.route('**/api/remove_chat_from_model', async (route) => {
        chats = [];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ result: 0 }),
        });
      });

      await openModelOptions(page, protoName);
      await page.getByRole('button', { name: 'Manage Chats' }).click();
      const modal = page.locator('.dialog-wrapper').filter({
        has: page.getByRole('heading', { name: `Manage Chats - ${protoName}` }),
      });
      await expect(modal).toBeVisible();
      await expect(modal.getByText('chat-e2e-1')).toBeVisible();
      await modal.getByRole('button', { name: 'Delete chat' }).click();
      await expect(page.getByText('Remove this chat?')).toBeVisible();
      await page.getByRole('button', { name: 'OK' }).click();
      await expect(page.getByText('Chat removed')).toBeVisible();
      await page.getByRole('button', { name: 'OK' }).click();
      await expect(modal.getByText('No chats found for this model')).toBeVisible();
    } finally {
      await cleanupModelByName(page, protoName);
      await cleanupPrototypeByName(page, protoName);
    }
  });

  test('should subscribe, unsubscribe, and resubscribe from the model menu', async ({ page, baseURL }) => {
    const protoName = `E2E SubMenu ${uniqueSuffix()}`;
    try {
      await createRemotePrototypeViaUi(page, {
        name: protoName,
        type: 'subscription',
        charge: 1,
      });
      await page.goto('/explore');
      await page.getByPlaceholder('Search prototypes...').fill(protoName);
      const exploreItem = page.locator('.list-item').filter({ hasText: protoName }).first();
      await expect(exploreItem).toBeVisible({ timeout: 15000 });
      await addToMyModels(page, exploreItem.locator('.actions'));

      let period = null;
      let autoRenew = false;
      await patchModelList(page, (models) =>
        models.map((model) => {
          if (model.name !== protoName) return model;
          return { ...model, type: 'subscription', period, auto_renew: autoRenew };
        })
      );

      await page.route('**/api/create_model_subscription_checkout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: 0,
            data: { url: `${baseURL}/models?subscription=success` },
          }),
        });
      });

      await openModelOptions(page, protoName);
      await page.getByRole('button', { name: 'Subscribe' }).click();
      await expect(page).toHaveURL(/subscription=success/, { timeout: 15000 });

      period = new Date(Date.now() + 86400000).toISOString();
      autoRenew = true;
      await page.route('**/api/cancel_model_subscription', async (route) => {
        autoRenew = false;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ result: 0 }),
        });
      });

      await openModelOptions(page, protoName);
      await page.getByRole('button', { name: 'Unsubscribe' }).click();
      await expect(page.getByText('Cancel subscription?')).toBeVisible();
      const cancel = page.waitForResponse((res) => res.url().includes('/api/cancel_model_subscription'));
      await page.getByRole('button', { name: 'OK' }).click();
      await cancel;

      await openModelOptions(page, protoName);
      await expect(page.getByRole('button', { name: 'Resubscribe' })).toBeVisible();
      await page.unroute('**/api/create_model_subscription_checkout');
      await page.route('**/api/create_model_subscription_checkout', async (route) => {
        autoRenew = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ result: 0, data: { subscribed: true } }),
        });
      });
      const resub = page.waitForResponse((res) => res.url().includes('/api/create_model_subscription_checkout'));
      await page.getByRole('button', { name: 'Resubscribe' }).click();
      await resub;
      await openModelOptions(page, protoName);
      await expect(page.getByRole('button', { name: 'Unsubscribe' })).toBeVisible();
    } finally {
      await cleanupModelByName(page, protoName);
      await cleanupPrototypeByName(page, protoName);
    }
  });
});
