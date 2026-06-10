import { test, expect } from '@playwright/test';
import { uniqueSuffix } from './utils.js';

test.describe.serial('Details Pages', () => {
  const authFile = 'playwright/.auth/user.json';
  let protoId = null;
  let modelId = null;
  let username = null;
  let protoName = null;

  test.beforeAll(async ({ browser }) => {
    const suffix = uniqueSuffix();
    protoName = `E2E Details ${suffix}`;
    const protoDesc = `Details description ${suffix}`;

    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();

    await page.goto('/my-prototypes');
    await page.locator('#page-my-prototypes').getByRole('button', { name: 'Create Prototype' }).click();
    await expect(page.getByRole('heading', { name: 'Create New Prototype' })).toBeVisible();
    await page.getByPlaceholder('e.g. my-awesome-account').fill(protoName);
    await page.getByPlaceholder('e.g. https://example.com').fill('https://tgbd.sokoyuku.com');
    await page.getByPlaceholder('e.g. /my-account').fill('prototypes.passive');
    await page.getByPlaceholder('Describe what this prototype does...').fill(protoDesc);
    await page.locator('.dialog-wrapper').getByRole('button', { name: 'Create Prototype' }).click();
    await expect(page.getByRole('heading', { name: 'Create New Prototype' })).toBeHidden({ timeout: 15000 });

    const protoItem = page.locator('.list-item').filter({ hasText: protoName }).first();
    await expect(protoItem).toBeVisible({ timeout: 15000 });
    await protoItem.click();
    await expect(page).toHaveURL(/\/prototype\/\d+/, { timeout: 15000 });
    {
      const m = page.url().match(/\/prototype\/(\d+)/);
      protoId = m ? m[1] : null;
    }
    if (!protoId) {
      throw new Error(`Failed to resolve prototypeId from URL: ${page.url()}`);
    }

    await page.goto('/profile');
    const usernameInput = page.locator('.list-item').filter({ hasText: 'Username' }).locator('input');
    username = await usernameInput.inputValue();
    if (!username) {
      throw new Error('Failed to resolve username from profile page');
    }

    await page.goto('/explore');
    await page.getByPlaceholder('Search prototypes...').fill(protoName);
    const exploreItem = page.locator('.list-item').filter({ hasText: protoName }).first();
    await expect(exploreItem).toBeVisible({ timeout: 15000 });
    await exploreItem.locator('.actions').getByRole('button', { name: 'Add to my models' }).click();

    await page.goto('/models');
    const modelItem = page.locator('.list-item').filter({ hasText: protoName }).first();
    await expect(modelItem).toBeVisible({ timeout: 15000 });
    await modelItem.click();
    await expect(page).toHaveURL(/\/model\/[0-9a-f]{32}/, { timeout: 15000 });
    {
      const m = page.url().match(/\/model\/([0-9a-f]{32})/);
      modelId = m ? m[1] : null;
    }
    if (!modelId) {
      throw new Error(`Failed to resolve modelId from URL: ${page.url()}`);
    }

    await page.close();
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();

    if (protoName) {
      await page.goto('/models');
      const modelItem = page.locator('.list-item').filter({ hasText: protoName }).first();
      if (await modelItem.count()) {
        await modelItem.getByRole('button', { name: 'Options' }).click();
        await page.getByText('Delete').click();
        await page.getByRole('button', { name: 'OK' }).click();
      }

      await page.goto('/my-prototypes');
      const protoItem = page.locator('.list-item').filter({ hasText: protoName }).first();
      if (await protoItem.count()) {
        await protoItem.getByRole('button', { name: 'Options' }).click();
        await page.getByText('Delete').click();
        await page.getByRole('button', { name: 'OK' }).click();
      }
    }

    await page.close();
    await context.close();
  });

  test('should display Model Details page', async ({ page }) => {
    await page.goto(`/model/${modelId}`);
    await expect(page.getByText('Model Details')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.list-item').filter({ hasText: 'Name' }).locator('input')).toHaveValue(protoName);
  });

  test('should display Prototype Details page and allow editing', async ({ page }) => {
    await page.goto(`/prototype/${protoId}`);
    await expect(page.getByText('Prototype Details')).toBeVisible();
    await expect(page.locator('.list-item').filter({ hasText: 'Name' }).locator('input')).toHaveValue(protoName);

    const updated = `${protoName} Updated`;
    const editButton = page.locator('button[aria-label="Edit prototype"]');
    await expect(editButton).toBeVisible({ timeout: 15000 });
    await editButton.click();
    await page.fill('#protoName', updated);
    await page.locator('button[aria-label="Save changes"]').click();
    await expect(page.locator('button[aria-label="Edit prototype"]')).toBeVisible();
    await expect(page.locator('.list-item').filter({ hasText: 'Name' }).locator('input')).toHaveValue(updated);

    await page.locator('button[aria-label="Edit prototype"]').click();
    await page.fill('#protoName', protoName);
    await page.locator('button[aria-label="Save changes"]').click();
    await expect(page.locator('button[aria-label="Edit prototype"]')).toBeVisible();
    await expect(page.locator('.list-item').filter({ hasText: 'Name' }).locator('input')).toHaveValue(protoName);
  });

  test('should display User Profile page', async ({ page }) => {
    await page.goto(`/user/${username}`);
    await expect(page.getByText('User Details')).toBeVisible();
    await expect(page.locator('.list-item').filter({ hasText: 'Username' }).locator('input')).toHaveValue(username);
    await expect(page.getByText('View Prototypes')).toBeVisible();
  });

  test('should display User Prototypes list', async ({ page }) => {
    await page.goto(`/prototypes/${username}`);
    await expect(page.getByText(`Prototypes by ${username}`)).toBeVisible();
    await expect(page.getByText(protoName)).toBeVisible();
  });

});
