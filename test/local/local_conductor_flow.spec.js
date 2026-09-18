import { test, expect } from '../fixtures.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addToMyModels, createLocalTelegramBotToken, uniqueSuffix } from '../utils.js';
import { getContactByUserId, getUserAccountByUsername, getModelByUserAndName, cleanupAccount } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const stationPublicKeyPath = path.join(repoRoot, 'config/dev/station/local_conductor_key.pem.pub');
const stationAccessPoint = 'http://localhost:8882';
const stationAdminToken = 'flow_e2e_shared_station_admin';

function loadStationConductorPublicKey() {
  const token = fs.readFileSync(stationPublicKeyPath, 'utf8').trim();
  if (!token.startsWith('lcpk1:')) {
    throw new Error(`invalid station public key token in ${stationPublicKeyPath}`);
  }
  return token;
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
    const conductorPublicKey = loadStationConductorPublicKey();
    const accessPoint = stationAccessPoint;

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

    let prototypeId = null;
    let accountUsername = null;
    let modelIdFromUrl = null;
    let accountId = null;

    try {
      const addProtoResp = await page.request.post('http://localhost:9000/api/add_prototype', {
        data: {
          name: protoName,
          description: '',
          access_point: accessPoint,
          path: 'prototypes.passive',
          status: 'active',
          private: true,
          max_chats: 1,
          charge: 0,
          max_charge_per_message: 0,
          type: 'token',
          billing_interval: '',
          reply_window: 600,
          is_local: true,
          qr_platforms: [],
          terms_of_use: '',
          privacy_policy: '',
          call_support: false,
        },
      });
      expect(addProtoResp.ok()).toBeTruthy();
      const addProto = await addProtoResp.json();
      expect(addProto.result).toBe(0);
      prototypeId = addProto.data.prototype_id;
      expect(prototypeId).toBeTruthy();

      const tokenResp = await page.request.post('http://localhost:9000/api/get_prototype_token', {
        data: { prototype_id: prototypeId },
      });
      expect(tokenResp.ok()).toBeTruthy();
      const tokenBody = await tokenResp.json();
      expect(tokenBody.result).toBe(0);
      const prototypeToken = tokenBody.data?.token || tokenBody.data?.prototype_token;
      expect(prototypeToken).toBeTruthy();

      const attachResp = await request.post(`${stationAccessPoint}/admin/prototype`, {
        headers: { 'X-Admin-Token': stationAdminToken },
        data: {
          prototype_id: prototypeId,
          token: prototypeToken,
          kind: 'station',
          name: protoName,
        },
      });
      expect(attachResp.ok()).toBeTruthy();
      const attachBody = await attachResp.json();
      expect(attachBody.result).toBe(0);

      await page.goto('/my-prototypes');
      await expect(page.getByText(protoName)).toBeVisible({ timeout: 15000 });
      const protoItem = page.locator('.list-item').filter({ hasText: protoName }).first();
      await expect(protoItem.getByTitle('Only visible to you')).toBeVisible({ timeout: 15000 });
      await addToMyModels(page, protoItem);

      await page.goto('/models');
      await expect(page.locator('.list-item').filter({ hasText: protoName }).first()).toBeVisible({
        timeout: 15000,
      });

      await expect
        .poll(async () => await getModelByUserAndName(userId, protoName), { timeout: 10000 })
        .toBeTruthy();

      const modelRow = await getModelByUserAndName(userId, protoName);
      expect(modelRow).toBeTruthy();
      expect(Boolean(modelRow.is_local)).toBeTruthy();
      expect(normalizeUrl(modelRow.conductor_address)).toBe(normalizeUrl(accessPoint));
      modelIdFromUrl = String(modelRow.model_id || '').replace(/-/g, '');
      expect(modelIdFromUrl).toMatch(/^[0-9a-f]{32}$/);

      const bot = await createLocalTelegramBotToken(request);
      accountUsername = bot.username;

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

      await expect(page.getByText(accountUsername)).toBeVisible({ timeout: 15000 });

      await expect
        .poll(async () => await getUserAccountByUsername(accountUsername), { timeout: 10000 })
        .toBeTruthy();

      const acctRow = await getUserAccountByUsername(accountUsername);
      expect(acctRow).toBeTruthy();
      expect(Boolean(acctRow.is_local)).toBeTruthy();
      expect(String(acctRow.account_token || '').startsWith('lcenc1:')).toBeTruthy();
      accountId = String(acctRow.account_id || '').replace(/-/g, '');

      const modelItem = page.locator('.list-item').filter({ hasText: protoName }).first();
      await modelItem.click();

      const modelDetailsDialog = page.locator('.dialog-wrapper', {
        has: page.getByRole('heading', { name: protoName }),
      });
      await expect(modelDetailsDialog).toBeVisible({ timeout: 15000 });
      await expect(modelDetailsDialog.getByRole('heading', { name: protoName })).toBeVisible();
      await modelDetailsDialog.getByRole('button', { name: 'Edit' }).click();

      await expect(modelDetailsDialog.getByText('Encrypted Settings')).toBeVisible({ timeout: 15000 });

      const newSettingsItem = modelDetailsDialog
        .locator('.list-item')
        .filter({ hasText: 'New Settings (JSON Object)' })
        .first();
      await newSettingsItem.locator('textarea').fill(JSON.stringify({ hello: 'world', n: 1 }));
      await modelDetailsDialog.getByRole('button', { name: 'Save' }).click();

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

      await page.goto(`/model/${modelIdFromUrl}`);
      await expect(page.getByText('Model Details')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Encrypted Settings')).toBeVisible();
      await page.locator('#page-model').getByRole('button', { name: 'Edit' }).click();
      await page
        .locator('.list-item')
        .filter({ hasText: 'New Settings (JSON Object)' })
        .locator('textarea')
        .fill(JSON.stringify({ hello: 'page', n: 2 }));
      await page.locator('#page-model').getByRole('button', { name: 'Save' }).click();
      await expect(page.locator('#page-model').getByRole('button', { name: 'Edit' })).toBeVisible({
        timeout: 15000,
      });
    } finally {
      if (modelIdFromUrl) {
        try {
          await page.request.post('http://localhost:9000/api/delete_model', { data: { model_id: modelIdFromUrl } });
        } catch (err) {
          console.error(`cleanup delete_model:`, err);
        }
      }
      if (accountId) {
        try {
          await page.request.post('http://localhost:9000/api/remove_account', { data: { account_id: accountId } });
        } catch (err) {
          console.error(`cleanup remove_account:`, err);
        }
      }
      if (accountUsername) {
        try {
          await cleanupAccount(accountUsername);
        } catch (err) {
          console.error(`cleanupAccount:`, err);
        }
      }
      if (prototypeId) {
        try {
          await page.request.post('http://localhost:9000/api/delete_prototype', {
            data: { prototype_id: prototypeId },
          });
        } catch (err) {
          console.error(`cleanup delete_prototype:`, err);
        }
      }
    }
  });
});
