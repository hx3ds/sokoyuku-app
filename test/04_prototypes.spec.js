import { test, expect } from './fixtures.js';
import {
  addToMyModels,
  cleanupModelByName,
  cleanupPrototypeByName,
  createRemotePrototypeViaUi,
  loadStationConductorPublicKey,
  mockClipboard,
  openCreatePrototypeDialog,
  saveConductorPublicKeyViaUi,
  uniqueSuffix,
} from './utils.js';

test.describe('Prototypes', () => {
  test('should explore prototypes', async ({ page }) => {
    await page.goto('/explore');
    await expect(page).toHaveURL(/\/explore/);
    await expect(page.getByPlaceholder('Search prototypes...')).toBeVisible();
    await expect(page.locator('.search-input')).toBeVisible();
  });

  test('should create a local prototype from the UI toggle', async ({ page }) => {
    const name = `E2E Local UI ${uniqueSuffix()}`;
    try {
      await saveConductorPublicKeyViaUi(page, loadStationConductorPublicKey());
      await createRemotePrototypeViaUi(page, {
        name,
        isLocal: true,
        accessPoint: 'http://localhost:8882',
      });
      const item = page.locator('.list-item').filter({ hasText: name }).first();
      await expect(item.getByTitle('Only visible to you')).toBeVisible();
      await item.click();
      await expect(page).toHaveURL(/\/prototype\/\d+/);
      await expect(page.locator('.list-item').filter({ hasText: 'Local' }).locator('input')).toHaveValue(
        'Yes'
      );
      await expect(page.getByRole('button', { name: 'Show Token' })).toHaveCount(0);
    } finally {
      await cleanupPrototypeByName(page, name);
    }
  });

  test('should create a subscription prototype with call support', async ({ page }) => {
    const name = `E2E Sub Proto ${uniqueSuffix()}`;
    try {
      await createRemotePrototypeViaUi(page, {
        name,
        callSupport: true,
        maxChats: 3,
        description: 'subscription e2e',
      });
      await page.locator('.list-item').filter({ hasText: name }).first().click();
      await expect(page).toHaveURL(/\/prototype\/\d+/);
      await expect(page.locator('.list-item').filter({ hasText: 'Type' }).locator('select')).toHaveValue(
        'subscription'
      );
      await expect(page.locator('.list-item').filter({ hasText: 'Call Support' }).locator('input')).toHaveValue(
        'Yes'
      );
      await expect(page.locator('#protoCharge')).toHaveValue('0');
      await expect(page.locator('#maxChats')).toHaveValue('3');
    } finally {
      await cleanupPrototypeByName(page, name);
    }
  });

  test('should refuse a paid prototype without a Stripe connected account', async ({ page }) => {
    const dialog = await openCreatePrototypeDialog(page);
    await dialog.getByPlaceholder('e.g. my-awesome-account').fill(`E2E Paid Gate ${uniqueSuffix()}`);
    await dialog.getByPlaceholder(/e\.g\. https:\/\/example\.com|e\.g\. http:\/\/localhost:8080/).fill(
      'https://tgbd.sokoyuku.com'
    );
    await dialog.getByPlaceholder('e.g. /my-account').fill('prototypes.passive');
    await dialog.locator('.list-item').filter({ hasText: 'Pro Charge' }).locator('input').fill('2.5');
    const [createRes] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/add_prototype') && r.request().method() === 'POST'
      ),
      dialog.getByRole('button', { name: 'Create Prototype' }).click(),
    ]);
    const createBody = await createRes.json();
    expect(createBody.result).not.toBe(0);
    await expect(dialog.getByText('Paid prototypes require a Stripe connected account')).toBeVisible();
  });

  test('should edit fields beyond name and show refresh token', async ({ page }) => {
    const name = `E2E Proto Edit ${uniqueSuffix()}`;
    try {
      await mockClipboard(page);
      await createRemotePrototypeViaUi(page, { name, description: 'before' });
      await page.locator('.list-item').filter({ hasText: name }).first().click();
      await expect(page.getByText('Prototype Details')).toBeVisible();
      await page.getByRole('button', { name: 'Edit prototype' }).click();
      await page.locator('#protoDescription').fill('after description');
      await page.locator('#maxChats').fill('4');
      await page.locator('#protoTermsOfUse').fill('https://example.com/terms');
      await page.locator('#protoPrivacyPolicy').fill('https://example.com/privacy');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByRole('button', { name: 'Edit prototype' })).toBeVisible({ timeout: 15000 });
      await expect(page.locator('#protoDescription')).toHaveValue('after description');
      await expect(page.locator('#maxChats')).toHaveValue('4');
      await expect(page.locator('.list-item').filter({ hasText: 'Terms of Use' }).locator('input')).toHaveValue(
        'Custom Terms of Use'
      );

      await page.getByRole('button', { name: 'Show Token' }).click();
      const tokenModal = page.locator('.dialog-wrapper').filter({
        has: page.getByRole('heading', { name: 'Token' }),
      });
      await expect(tokenModal).toBeVisible();
      const tokenInput = tokenModal.locator('.list-item').filter({ hasText: 'Token' }).locator('input');
      await expect.poll(async () => tokenInput.inputValue()).not.toBe('');
      const firstToken = await tokenInput.inputValue();
      await tokenModal.getByRole('button', { name: 'Refresh Token' }).click();
      await expect.poll(async () => tokenInput.inputValue()).not.toBe('');
      const refreshed = await tokenInput.inputValue();
      expect(refreshed).toBeTruthy();
      await tokenModal.getByRole('button', { name: 'Copy Token' }).click();
      await expect(page.getByText('Token copied to clipboard')).toBeVisible();
      await expect.poll(async () => page.evaluate(() => window.__pwClipboard)).toBe(refreshed || firstToken);
    } finally {
      await cleanupPrototypeByName(page, name);
    }
  });

  test('should rename when adding a duplicate model', async ({ page }) => {
    const name = `E2E Dup ${uniqueSuffix()}`;
    const renamed = `${name} Copy`;
    try {
      await createRemotePrototypeViaUi(page, { name });
      await page.goto('/explore');
      await page.getByPlaceholder('Search prototypes...').fill(name);
      const item = page.locator('.list-item').filter({ hasText: name }).first();
      await expect(item).toBeVisible({ timeout: 15000 });
      await addToMyModels(page, item.locator('.actions'));

      const addBtn = item.locator('.actions').getByRole('button', { name: 'Add to my models' });
      await expect(addBtn).toBeEnabled();
      const dupPromise = page.waitForResponse(
        (r) => r.url().includes('/api/add_prototype_to_user_model_list') && r.request().method() === 'POST'
      );
      await addBtn.click();
      const dupBody = await (await dupPromise).json();
      expect(dupBody.result).not.toBe(0);

      const renameModal = page.locator('.dialog-wrapper').filter({
        has: page.getByRole('heading', { name: 'Add to My Models' }),
      });
      await expect(renameModal).toBeVisible();
      await renameModal.getByPlaceholder('Enter unique model name').fill(renamed);
      await renameModal.getByRole('button', { name: 'Add' }).click();
      await expect(renameModal).toBeHidden({ timeout: 15000 });
      await page.goto('/models');
      await expect(page.locator('.list-item').filter({ hasText: name }).first()).toBeVisible({
        timeout: 15000,
      });
      await expect(page.locator('.list-item').filter({ hasText: renamed }).first()).toBeVisible();
    } finally {
      await cleanupModelByName(page, name);
      await cleanupModelByName(page, renamed);
      await cleanupPrototypeByName(page, name);
    }
  });
});
