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

    await page.goto('/change-password');
    await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();

    await page.locator('#changePasswordEmail').fill(user.email);
    await page.getByRole('button', { name: 'Get Code' }).click();

    const oldCode = code;
    let newCode = null;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      const c = await getVerificationCode(user.email, 'change_password');
      if (c && c !== oldCode) {
        newCode = c;
        break;
      }
    }
    expect(newCode, 'Should generate a new verification code').toBeTruthy();

    const newPassword = 'NewPassword789!';
    await page.locator('#changePasswordVerificationCode').fill(newCode);
    await page.locator('#changePasswordNew').fill(newPassword);
    
    await page.getByRole('button', { name: 'Reset Password' }).click();

    await expect(page).toHaveURL(/\/signin/);
    
    await page.goto('/signin');
    await page.locator('#signinIdentifier').fill(user.email);
    await page.locator('#signinPassword').fill(newPassword);
    await page.locator('#signinTerms').check();
    
    await page.getByRole('button', { name: 'Enter' }).click();
    await expect(page).toHaveURL(/\/models/);
  });
});
