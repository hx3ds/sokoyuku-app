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
  
  // Fill email
  await page.getByPlaceholder('Enter your email').fill(user.email);
  
  // Click Get Code
  await page.getByRole('button', { name: 'Get Code' }).click();
  await expect(page.getByRole('button', { name: /\d+s/ })).toBeVisible({ timeout: 15000 });
  
  // Poll for code
  let code = null;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    code = await getVerificationCode(user.email, 'sign_up');
    if (code) break;
  }
  expect(code, 'Verification code should be generated').toBeTruthy();
  console.log('Got code:', code);
  
  // Fill rest
  await page.getByPlaceholder('Enter 6-digit code').fill(code);
  await page.getByPlaceholder('Enter your full name').fill(user.fullName);
  await page.getByPlaceholder('Enter your username').fill(user.username);
  await page.getByPlaceholder('Enter your password').fill(user.password);
  
  // Agree to terms
  await page.locator('#signupTerms').check();

  // Submit
  await page.getByRole('button', { name: 'Sign Up' }).click();
  
  // Expect redirect to signin or similar (depends on flow)
  // The signup page says: history.pushState(null, '', '/signin');
  await expect(page).toHaveURL(/\/signin/);
  
  // Go to password signin
  await page.goto('/signin-password');
  
  await page.getByPlaceholder('Enter your email or username').fill(user.email);
  await page.getByPlaceholder('Enter your password').fill(user.password);
  
  // Agree to terms (checkbox)
  // The checkbox is custom InfoStackCheckbox.
  // It usually wraps a real checkbox input.
  // Let's try checking it by label or role.
  // The code has: I confirm that I have read and agree...
  await page.getByRole('checkbox').check();
  
  await page.getByRole('button', { name: 'Enter' }).click();
  
  // Expect redirect to /models
  await expect(page).toHaveURL(/\/models/);
  
  // Save storage state
  await page.context().storageState({ path: authFile });
});

setup.afterAll(async () => {
  await closePool();
});
