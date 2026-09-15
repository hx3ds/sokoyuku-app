import { expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
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

export async function clickAppNav(page, path) {
  const nav = page.locator(`a.sidebar-link[href="${path}"], a.bottom-link[href="${path}"]`).filter({ visible: true });
  await expect(nav).toHaveCount(1);
  await nav.click();
}

export function isWideDesktop(page) {
  const viewport = page.viewportSize();
  return !!viewport && viewport.width >= 1280;
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
