import { test, expect } from '@playwright/test';
import { generateUser } from './utils';
import { getVerificationCode } from './db';
import { installTurnstileMock } from './turnstile';

test.describe('Authentication Flow', () => {
  // We can't reuse the setup user for signup tests, so we create a new one.
  test.beforeEach(async ({ page }) => {
    await installTurnstileMock(page);
  });
  
  test('should fail with invalid email', async ({ page }) => {
    await page.goto('/signup');
    await page.locator('#signupEmail').fill('invalid-email');
    await page.getByRole('button', { name: 'Get Code' }).click();
    await expect.poll(async () => {
      return page.locator('#signupEmail').evaluate((el) => {
        if (!(el instanceof HTMLInputElement)) return '';
        return el.validationMessage || (el.validity.valid ? '' : 'invalid');
      });
    }).not.toBe('');
    await expect(page.getByRole('button', { name: 'Get Code' })).toBeVisible();
  });

  test('should reject invalid verification code', async ({ page }) => {
    const user = generateUser();
    await page.goto('/signup');
    
    await page.locator('#signupEmail').fill(user.email);
    await page.getByRole('button', { name: 'Get Code' }).click();
    
    await page.locator('#signupVerificationCode').fill('000000');
    await page.locator('#signupFullName').fill(user.fullName);
    await page.locator('#signupUsername').fill(user.username);
    await page.locator('#signupPassword').fill(user.password);
    
    await page.locator('#signupTerms').check();
    await page.getByRole('button', { name: 'Sign Up' }).click();
    
    await expect(page.getByText(/invalid or expired verification code/i)).toBeVisible();
  });

  test('should allow full signup flow', async ({ page }) => {
    const user = generateUser();
    await page.goto('/signup');
    
    await page.locator('#signupEmail').fill(user.email);
    await page.getByRole('button', { name: 'Get Code' }).click();
    
    let code = null;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      code = await getVerificationCode(user.email, 'sign_up');
      if (code) break;
    }
    expect(code).toBeTruthy();
    
    await page.locator('#signupVerificationCode').fill(code);
    await page.locator('#signupFullName').fill(user.fullName);
    await page.locator('#signupUsername').fill(user.username);
    await page.locator('#signupPassword').fill(user.password);
    
    await page.locator('#signupTerms').check();

    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page).toHaveURL(/\/signin/);
  });

  test('should show error for invalid password sign-in', async ({ page }) => {
    await page.route('**/api/sign_in', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: 1, msg: 'Invalid credentials' })
      });
    });

    await page.goto('/signin');
    await page.locator('#signinIdentifier').fill('bad@example.com');
    await page.locator('#signinPassword').fill('badpassword');
    await page.locator('#signinTerms').check();
    await page.getByRole('button', { name: 'Enter' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});
