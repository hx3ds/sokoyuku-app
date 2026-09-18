import { expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanupContactAfter } from './cleanup.js';
import {
  cleanupAccount,
  cleanupUserViaDB,
  getModelByName,
  getPrototypeByName,
  getUserAccountByUsername,
} from './db.js';

const API_BASE = process.env.VITE_BASE_URL || 'http://localhost:9000';

function normalizeUuid(id) {
  return String(id || '').replace(/-/g, '');
}

export function generateUser() {
  const id = uuidv4().split('-')[0];
  return {
    email: `test_user_${id}@example.com`,
    username: `user_${id}`,
    fullName: `Test User ${id}`,
    password: 'Password123!',
  };
}

/** Like testsuite.newAuthedUserClient prep: unique user + register CleanupUserViaDB. */
export async function prepareTrackedUser() {
  const user = generateUser();
  cleanupContactAfter(user.email);
  try {
    await cleanupUserViaDB(user.email);
  } catch (err) {
    console.error(`pre-clean CleanupUserViaDB(${user.email}):`, err);
  }
  return user;
}

export async function submitAuthForm(page, buttonName, apiPath) {
  const responsePromise = page.waitForResponse(
    (res) => res.url().includes(apiPath) && res.request().method() === 'POST',
    { timeout: 30000 }
  );
  await page.getByRole('button', { name: buttonName }).click();
  const res = await responsePromise;
  return res.json();
}

export async function clickAppNav(page, path) {
  const nav = page.locator(`a.sidebar-link[href="${path}"], a.bottom-link[href="${path}"]`).filter({ visible: true });
  await expect(nav).toHaveCount(1);
  await nav.click();
}

export function isWideDesktop(page) {
  const viewport = page.viewportSize();
  return !!viewport && viewport.width >= 1280;
}

export function isMobileViewport(page) {
  const viewport = page.viewportSize();
  return !!viewport && viewport.width < 768;
}

export async function mockClipboard(page) {
  await page.addInitScript(() => {
    window.__pwClipboard = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__pwClipboard = String(text ?? '');
        },
        readText: async () => window.__pwClipboard || '',
      },
    });
  });
}

export function loadStationConductorPublicKey() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const token = fs.readFileSync(
    path.join(repoRoot, 'config/dev/station/local_conductor_key.pem.pub'),
    'utf8'
  ).trim();
  if (!token.startsWith('lcpk1:')) {
    throw new Error('invalid station public key token');
  }
  return token;
}

export async function saveConductorPublicKeyViaUi(page, key) {
  await page.goto('/profile');
  const localConductorSection = page.locator('.list-section', {
    has: page.getByRole('heading', { name: 'Local Conductor' }),
  });
  await expect(localConductorSection).toBeVisible({ timeout: 15000 });
  await localConductorSection
    .getByRole('button', { name: /Show Conductor Public Key|Set Conductor Public Key/ })
    .click();
  const modal = page.locator('.dialog-wrapper').filter({
    has: page.getByPlaceholder('lcpk1:...'),
  });
  await expect(modal).toBeVisible();
  await modal.getByPlaceholder('lcpk1:...').fill(key);
  await modal.getByRole('button', { name: 'Save' }).click();
  await expect(modal).toBeHidden({ timeout: 15000 });
}

export async function openCreatePrototypeDialog(page) {
  await page.goto('/my-prototypes');
  await expect(page).toHaveURL(/\/my-prototypes/);
  await page.locator('#page-my-prototypes').getByRole('button', { name: 'Create Prototype' }).click();
  const dialog = page.locator('.dialog-wrapper').filter({
    has: page.getByRole('heading', { name: 'Create New Prototype' }),
  });
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function createRemotePrototypeViaUi(page, options) {
  const name = options.name;
  const dialog = await openCreatePrototypeDialog(page);
  await dialog.getByPlaceholder('e.g. my-awesome-account').fill(name);
  if (options.isLocal) {
    await dialog.locator('.list-item').filter({ hasText: 'Local Prototype' }).click();
  }
  await dialog.getByPlaceholder(/e\.g\. https:\/\/example\.com|e\.g\. localhost:8080/).fill(
    options.accessPoint || (options.isLocal ? 'http://localhost:8882' : 'https://tgbd.sokoyuku.com')
  );
  await dialog.getByPlaceholder('e.g. /my-account').fill(options.path || 'prototypes.passive');
  if (options.description) {
    await dialog.getByPlaceholder('Describe what this prototype does...').fill(options.description);
  }
  if (options.type === 'subscription') {
    await dialog.locator('.list-item').filter({ hasText: 'Type' }).locator('select').selectOption('subscription');
    if (options.callSupport) {
      await dialog.locator('.list-item').filter({ hasText: 'Call Support' }).click();
    }
    if (options.charge != null) {
      await dialog.locator('.list-item').filter({ hasText: 'Pro Charge' }).locator('input').fill(String(options.charge));
    }
  }
  if (options.maxChats != null) {
    await dialog.locator('.list-item').filter({ hasText: 'Max Chats' }).locator('input').fill(String(options.maxChats));
  }
  if (options.replyWindow != null) {
    await dialog.locator('.list-item').filter({ hasText: 'Reply Window (sec)' }).locator('input').fill(String(options.replyWindow));
  }
  await dialog.getByRole('button', { name: 'Create Prototype' }).click();
  await expect(page.getByRole('heading', { name: 'Create New Prototype' })).toBeHidden({ timeout: 15000 });
  await expect(page.locator('.list-item').filter({ hasText: name }).first()).toBeVisible({ timeout: 15000 });
}

export function uniqueSuffix() {
  return `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export async function createLocalTelegramBotToken(request) {
  const res = await request.post('http://localhost:9992/api/generate_bot', {
    data: {},
  });
  if (!res.ok()) {
    throw new Error(`tgb generate_bot failed: ${res.status()} ${res.statusText()}`);
  }
  const body = await res.json();
  if (!body?.ok || !body?.result?.token || !body?.result?.username) {
    throw new Error(`tgb generate_bot returned invalid response: ${JSON.stringify(body)}`);
  }
  return { token: body.result.token, username: body.result.username };
}

/** Click "Add to my models" and wait for a successful API response (avoids aborting on navigation). */
export async function addToMyModels(page, itemLocator, { timeout = 60000 } = {}) {
  const button = itemLocator.getByRole('button', { name: 'Add to my models' });
  const responsePromise = page.waitForResponse(
    async (res) => {
      if (!res.url().includes('/api/add_prototype_to_user_model_list')) {
        return false;
      }
      try {
        const body = await res.json();
        return body?.result === 0;
      } catch {
        return false;
      }
    },
    { timeout }
  );
  await button.click();
  const res = await responsePromise;
  return res.json();
}

export function normalizeModelId(modelId) {
  return String(modelId || '').replace(/-/g, '');
}

/**
 * Best-effort cleanup for shared-user resources.
 * Prefer authenticated API deletes (safe under parallel workers); fall back to UI/DB.
 */
export async function cleanupModelByName(page, name) {
  name = String(name || '').trim();
  if (!name) return;
  try {
    const row = await getModelByName(name);
    if (row?.model_id) {
      await page.request.post(`${API_BASE}/api/delete_model`, {
        data: { model_id: normalizeUuid(row.model_id) },
      });
      return;
    }
  } catch (err) {
    console.error(`cleanupModelByName API(${name}):`, err);
  }
  try {
    await page.goto('/models');
    const modelItem = page.locator('.list-item').filter({ hasText: name }).first();
    if ((await modelItem.count()) === 0) return;
    await modelItem.getByRole('button', { name: 'Options' }).click();
    await page.getByText('Delete', { exact: true }).click();
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('.list-item').filter({ hasText: name })).toHaveCount(0, {
      timeout: 15000,
    });
  } catch (err) {
    console.error(`cleanupModelByName UI(${name}):`, err);
  }
}

export async function cleanupPrototypeByName(page, name) {
  name = String(name || '').trim();
  if (!name) return;
  // Models reference prototypes; remove matching model first when names align.
  await cleanupModelByName(page, name);
  try {
    const row = await getPrototypeByName(name);
    if (row?.prototype_id != null) {
      await page.request.post(`${API_BASE}/api/delete_prototype`, {
        data: { prototype_id: Number(row.prototype_id) },
      });
      return;
    }
  } catch (err) {
    console.error(`cleanupPrototypeByName API(${name}):`, err);
  }
  try {
    await page.goto('/my-prototypes');
    const protoItem = page.locator('.list-item').filter({ hasText: name }).first();
    if ((await protoItem.count()) === 0) return;
    await protoItem.getByRole('button', { name: 'Options' }).click();
    await page.getByText('Delete', { exact: true }).click();
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('.list-item').filter({ hasText: name })).toHaveCount(0, {
      timeout: 15000,
    });
  } catch (err) {
    console.error(`cleanupPrototypeByName UI(${name}):`, err);
  }
}

export async function cleanupAccountByUsername(page, accountUsername) {
  accountUsername = String(accountUsername || '').trim();
  if (!accountUsername) return;
  try {
    const row = await getUserAccountByUsername(accountUsername);
    if (row?.account_id) {
      await page.request.post(`${API_BASE}/api/remove_account`, {
        data: { account_id: normalizeUuid(row.account_id) },
      });
    }
  } catch (err) {
    console.error(`cleanupAccountByUsername API(${accountUsername}):`, err);
  }
  try {
    await cleanupAccount(accountUsername);
  } catch (err) {
    console.error(`cleanupAccountByUsername DB(${accountUsername}):`, err);
  }
}
