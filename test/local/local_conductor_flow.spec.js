import { test, expect } from '@playwright/test';
import { generateKeyPairSync } from 'crypto';
import { uniqueSuffix, createLocalTelegramBotToken } from '../utils.js';
import { getContactByUserId, getUserAccountByUsername, getModelByUserAndName } from '../db.js';

function generateConductorPublicKeyToken() {
  const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 0x10001 });
  const jwk = publicKey.export({ format: 'jwk' });
  const minimal = { kty: 'RSA', n: String(jwk.n), e: String(jwk.e) };
  const raw = Buffer.from(JSON.stringify(minimal), 'utf8').toString('base64url');
  return `lcpk1:${raw}`;
}

function normalizeUrl(u) {
  return String(u || '').trim().replace(/\/+$/, '');
}

test.describe('Local Conductor E2E', () => {
  test('should manage public key, create local prototype/model/account, and store encrypted secrets', async ({ page, request }) => {
    test.setTimeout(120000);

    page.on('console', (msg) => console.log(`[browser console:${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (err) => console.log('[browser pageerror]', err?.stack || String(err)));
    page.on('requestfailed', (req) => console.log('[requestfailed]', req.method(), req.url(), req.failure()));

    const suffix = uniqueSuffix();
    const protoName = `E2E Local Proto ${suffix}`;
    const accountName = `E2E Local Account ${suffix}`;
    const conductorPublicKey = generateConductorPublicKeyToken();
    const accessPoint = 'http://localhost:9991';

    const whoamiResp = await page.request.post('http://localhost:9000/api/whoami', { data: {} });
    expect(whoamiResp.ok()).toBeTruthy();
    const whoami = await whoamiResp.json();
    expect(whoami.result).toBe(0);
    const userId = whoami.data.user_id;

    await page.goto('/profile');
    const localConductorSection = page.locator('.list-section', {
      has: page.getByRole('heading', { name: 'Local Conductor' }),
    });
    await expect(localConductorSection).toBeVisible({ timeout: 15000 });
    await localConductorSection.getByRole('button', { name: /Show Conductor Public Key|Set Conductor Public Key/ }).click();
    const conductorPublicKeyModal = page.locator('.dialog-wrapper').filter({
      has: page.getByPlaceholder('lcpk1:...'),
    });
    await expect(conductorPublicKeyModal).toBeVisible({ timeout: 15000 });
    await conductorPublicKeyModal.getByPlaceholder('lcpk1:...').fill(conductorPublicKey);
    await conductorPublicKeyModal.getByRole('button', { name: 'Save' }).click();
    await expect(conductorPublicKeyModal).toBeHidden({ timeout: 15000 });

    await expect
      .poll(async () => {
        const row = await getContactByUserId(userId);
        return row?.conductor_public_key || '';
      })
      .toBe(conductorPublicKey);

    const addProtoResp = await page.request.post('http://localhost:9000/api/add_prototype', {
      data: {
        name: protoName,
        description: '',
        access_point: accessPoint,
        path: 'prototypes.passive',
        status: 'active',
        private: false,
        max_chats: 1,
        charge: 100,
        type: 'token',
        reply_window: 600,
        is_local: true,
      },
    });
    expect(addProtoResp.ok()).toBeTruthy();
    const addProto = await addProtoResp.json();
    expect(addProto.result).toBe(0);
    const prototypeId = addProto.data.prototype_id;
    expect(prototypeId).toBeTruthy();

    await page.goto('/my-prototypes');
    await expect(page.getByText(protoName)).toBeVisible({ timeout: 15000 });
    const protoItem = page.locator('.list-item').filter({ hasText: protoName }).first();
    await expect(protoItem.locator('span').filter({ hasText: /^Local$/ })).toBeVisible({ timeout: 15000 });
    await protoItem.getByRole('button', { name: 'Add to my models' }).click();

    await page.goto('/models');
    await expect
      .poll(
        async () => {
          const n = await page.locator('.list-item').filter({ hasText: protoName }).count();
          if (n === 0) await page.reload();
          return n;
        },
        { timeout: 30000 }
      )
      .toBeGreaterThan(0);

    await expect
      .poll(async () => await getModelByUserAndName(userId, protoName), { timeout: 10000 })
      .toBeTruthy();

    const modelRow = await getModelByUserAndName(userId, protoName);
    expect(modelRow).toBeTruthy();
    expect(Boolean(modelRow.is_local)).toBeTruthy();
    expect(normalizeUrl(modelRow.conductor_address)).toBe(normalizeUrl(accessPoint));

    const bot = await createLocalTelegramBotToken(request);
    const accountUsername = bot.username;

    await page.goto('/models');
    await page.getByRole('button', { name: 'Add account' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Account' })).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder('Enter name').fill(accountName);
    await page.getByPlaceholder('Enter username').fill(accountUsername);
    await page.getByPlaceholder('Enter token').fill(bot.token);
    await page.getByPlaceholder('Enter account description').fill('Local account');
    await page.locator('.list-item').filter({ hasText: 'Local Account' }).click();
    await page.getByRole('button', { name: 'Save Account' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Account' })).toBeHidden({ timeout: 15000 });

    await expect(page.getByText(`@${accountUsername}`)).toBeVisible({ timeout: 15000 });

    await expect
      .poll(async () => await getUserAccountByUsername(accountUsername), { timeout: 10000 })
      .toBeTruthy();

    const acctRow = await getUserAccountByUsername(accountUsername);
    expect(acctRow).toBeTruthy();
    expect(Boolean(acctRow.is_local)).toBeTruthy();
    expect(String(acctRow.account_token || '').startsWith('lcenc1:')).toBeTruthy();

    const modelItem = page.locator('.list-item').filter({ hasText: protoName }).first();
    await modelItem.click();
    await expect(page).toHaveURL(/\/model\/[0-9a-f]{32}/, { timeout: 15000 });
    const modelIdFromUrl = page.url().split('/model/')[1]?.split(/[?#]/)[0];
    expect(modelIdFromUrl).toMatch(/^[0-9a-f]{32}$/);

    const modelDetailsSection = page.locator('.list-section', {
      has: page.getByRole('heading', { name: 'Model Details' }),
    });
    await expect(modelDetailsSection).toBeVisible({ timeout: 15000 });
    await modelDetailsSection.getByRole('button', { name: 'Edit' }).click();

    const settingsSection = page.locator('.list-section', {
      has: page.getByRole('heading', { name: 'Model Settings' }),
    });
    await expect(settingsSection.getByText('Encrypted Settings')).toBeVisible({ timeout: 15000 });

    const newSettingsItem = page.locator('.list-item').filter({ hasText: 'New Settings (JSON Object)' }).first();
    await newSettingsItem.locator('textarea').fill(JSON.stringify({ hello: 'world', n: 1 }));
    await modelDetailsSection.getByRole('button', { name: 'Save' }).click();

    await expect
      .poll(
        async () => {
          const updated = await getModelByUserAndName(userId, protoName);
          try {
            const obj = typeof updated?.settings === 'string' ? JSON.parse(updated.settings) : updated?.settings;
            return obj?.__enc__ || '';
          } catch {
            return '';
          }
        },
        { timeout: 15000 }
      )
      .toMatch(/^lcenc1:/);

    const delModelResp = await page.request.post('http://localhost:9000/api/delete_model', { data: { model_id: modelIdFromUrl } });
    expect(delModelResp.ok()).toBeTruthy();
    const delModel = await delModelResp.json();
    expect(delModel.result).toBe(0);

    const delAcctResp = await page.request.post('http://localhost:9000/api/remove_account', {
      data: { account_id: String(acctRow.account_id || '').replace(/-/g, '') },
    });
    expect(delAcctResp.ok()).toBeTruthy();
    const delAcct = await delAcctResp.json();
    expect(delAcct.result).toBe(0);

    const delProtoResp = await page.request.post('http://localhost:9000/api/delete_prototype', { data: { prototype_id: prototypeId } });
    expect(delProtoResp.ok()).toBeTruthy();
    const delProto = await delProtoResp.json();
    expect(delProto.result).toBe(0);
  });
});
