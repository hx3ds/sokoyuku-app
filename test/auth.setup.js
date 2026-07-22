import { test as setup, expect } from '@playwright/test';
import { generateUser } from './utils';
import { getVerificationCode, closePool } from './db';
import { installTurnstileMock } from './turnstile';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const user = generateUser();
  console.log('Creating user:', user.email);

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

  await page.getByRole('button', { name: 'Sign Up' }).click();
  
  await expect(page).toHaveURL(/\/signin/);
  
  await page.locator('#signinIdentifier').fill(user.email);
  await page.locator('#signinPassword').fill(user.password);
  await page.locator('#signinTerms').check();
  
  await page.getByRole('button', { name: 'Enter' }).click();
  
  // Expect redirect to /models
  await expect(page).toHaveURL(/\/models/);
  
  // Save storage state
  await page.context().storageState({ path: authFile });
});

setup.afterAll(async () => {
  await closePool();
});
