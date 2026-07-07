import { test, expect } from '@playwright/test';
import { generateUser } from './utils';
import { getVerificationCode } from './db';
import { installTurnstileMock } from './turnstile';

test.describe('Password Reset Flow', () => {
  test.beforeEach(async ({ page }) => {
    await installTurnstileMock(page);
  });

  test('should allow full signup and then password reset', async ({ page }) => {
    // 1. Sign Up a new user
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

    // 2. Go to Change Password (Forgot Password) page
    await page.goto('/change-password');
    await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();

    // 3. Request Code
    await page.getByPlaceholder('Enter your email').fill(user.email);
    await page.getByRole('button', { name: 'Get Code' }).click();

    // 4. Get new code
    // We need to wait a bit or check for a newer code.
    // The DB query `ORDER BY expires_at DESC LIMIT 1` should get the latest one.
    // But since we just got one for signup, we need to make sure we get the NEW one.
    // We can clear the old code or wait?
    // Or we can check if the code is different?
    // Actually, `getVerificationCode` just returns the latest.
    // We should wait until we get a DIFFERENT code or wait a few seconds.
    // Better: record the old code, loop until we get a new one.
    
    const oldCode = code;
    let newCode = null;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000); // Wait longer for email delivery/db insert
      const c = await getVerificationCode(user.email, 'change_password');
      if (c && c !== oldCode) {
        newCode = c;
        break;
      }
    }
    expect(newCode, 'Should generate a new verification code').toBeTruthy();

    // 5. Fill new password
    const newPassword = 'NewPassword789!';
    await page.getByPlaceholder('Enter 6-digit code').fill(newCode);
    await page.getByPlaceholder('Enter your new password').fill(newPassword);
    
    // 6. Submit
    await page.getByRole('button', { name: 'Reset Password' }).click();

    // 7. Verify Redirect to Signin
    await expect(page).toHaveURL(/\/signin/);
    
    // 8. Sign In with NEW password
    await page.goto('/signin-password');
    await page.getByPlaceholder('Enter your email or username').fill(user.email);
    await page.getByPlaceholder('Enter your password').fill(newPassword);
    
    // Check terms if present (it was in auth.setup.js)
    const termsCheckbox = page.getByRole('checkbox');
    if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
    }
    
    await page.getByRole('button', { name: 'Enter' }).click();
    await expect(page).toHaveURL(/\/models/);
  });
});
