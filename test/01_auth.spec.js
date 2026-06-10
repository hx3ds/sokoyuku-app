import { test, expect } from '@playwright/test';
import { generateUser } from './utils';
import { getVerificationCode } from './db';

test.describe('Authentication Flow', () => {
  // We can't reuse the setup user for signup tests, so we create a new one.
  
  test('should fail with invalid email', async ({ page }) => {
    await page.goto('/signup');
    await page.getByPlaceholder('Enter your email').fill('invalid-email');
    await page.getByRole('button', { name: 'Get Code' }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('should reject invalid verification code', async ({ page }) => {
    const user = generateUser();
    await page.goto('/signup');
    
    await page.getByPlaceholder('Enter your email').fill(user.email);
    await page.getByRole('button', { name: 'Get Code' }).click();
    
    await page.getByPlaceholder('Enter 6-digit code').fill('000000');
    await page.getByPlaceholder('Enter your full name').fill(user.fullName);
    await page.getByPlaceholder('Enter your username').fill(user.username);
    await page.getByPlaceholder('Enter your password').fill(user.password);
    
    await page.locator('#signupTerms').check();
    await page.getByRole('button', { name: 'Sign Up' }).click();
    
    await expect(page.getByText(/invalid or expired verification code/i)).toBeVisible();
  });

  test('should allow full signup flow', async ({ page }) => {
    const user = generateUser();
    await page.goto('/signup');
    
    await page.getByPlaceholder('Enter your email').fill(user.email);
    await page.getByRole('button', { name: 'Get Code' }).click();
    
    let code = null;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      code = await getVerificationCode(user.email, 'sign_up');
      if (code) break;
    }
    expect(code).toBeTruthy();
    
    await page.getByPlaceholder('Enter 6-digit code').fill(code);
    await page.getByPlaceholder('Enter your full name').fill(user.fullName);
    await page.getByPlaceholder('Enter your username').fill(user.username);
    await page.getByPlaceholder('Enter your password').fill(user.password);
    
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

    await page.goto('/signin-password');
    await page.getByPlaceholder('Enter your email or username').fill('bad@example.com');
    await page.getByPlaceholder('Enter your password').fill('badpassword');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Enter' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});
