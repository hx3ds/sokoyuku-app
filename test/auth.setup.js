import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { prepareTrackedUser, submitAuthForm } from './utils.js';
import { getVerificationCode, closePool } from './db.js';
import { saveSetupUserEmail } from './cleanup.js';
import { installTurnstileMock } from './turnstile.js';
import { WORKER_COUNT } from './constants.js';

const authDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../playwright/.auth');

async function authenticateInto(page, authFile) {
  const user = await prepareTrackedUser();
  saveSetupUserEmail(user.email);
  console.log(`Creating user (${path.basename(authFile)}):`, user.email);

  await installTurnstileMock(page);
  await page.goto('/signup');

  await page.locator('#signupEmail').fill(user.email);
  await page.getByRole('button', { name: 'Get Code' }).click();
  await expect(page.getByRole('button', { name: /\d+s/ })).toBeVisible({ timeout: 15000 });

  let code = null;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    code = await getVerificationCode(user.email, 'sign_up');
    if (code) break;
  }
  expect(code, 'Verification code should be generated').toBeTruthy();
  console.log('Got code:', code);

  await page.locator('#signupVerificationCode').fill(code);
  await page.locator('#signupFullName').fill(user.fullName);
  await page.locator('#signupUsername').fill(user.username);
  await page.locator('#signupPassword').fill(user.password);
  await page.locator('#signupTerms').check();

  const signUp = await submitAuthForm(page, 'Sign Up', '/api/sign_up');
  expect(signUp.result, `sign_up: ${JSON.stringify(signUp)}`).toBe(0);
  await expect(page).toHaveURL(/\/signin/);

  await page.locator('#signinIdentifier').fill(user.email);
  await page.locator('#signinPassword').fill(user.password);
  await page.locator('#signinTerms').check();

  const signIn = await submitAuthForm(page, 'Enter', '/api/sign_in');
  expect(signIn.result, `sign_in: ${JSON.stringify(signIn)}`).toBe(0);
  await expect(page).toHaveURL(/\/models/);

  await page.context().storageState({ path: authFile });
}

for (let i = 0; i < WORKER_COUNT; i++) {
  const workerIndex = i;
  setup(`authenticate worker ${workerIndex}`, async ({ page }) => {
    await authenticateInto(page, path.join(authDir, `user-${workerIndex}.json`));
  });
}

setup.afterAll(async () => {
  await closePool();
});
