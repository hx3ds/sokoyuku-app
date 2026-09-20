import { test, expect } from './fixtures.js';
import { prepareTrackedUser, submitAuthForm } from './utils';
import { getVerificationCode } from './db';
import { installTurnstileMock } from './turnstile';

test.describe('Authentication Flow', () => {
  // Anonymous browser — do not reuse per-worker setup cookies.
  test.use({ storageState: { cookies: [], origins: [] } });

  // We can't reuse the setup user for signup tests, so we create a new one.
  test.beforeEach(async ({ page }) => {
    await installTurnstileMock(page);
  });

  test('should fail with invalid email', async ({ page }) => {
    await page.goto('/signup');
    await page.locator('#signupEmail').fill('invalid-email');
    await page.getByRole('button', { name: 'Get Code' }).click();
    await expect
      .poll(async () => {
        return page.locator('#signupEmail').evaluate((el) => {
          if (!(el instanceof HTMLInputElement)) return '';
          return el.validationMessage || (el.validity.valid ? '' : 'invalid');
        });
      })
      .not.toBe('');
    await expect(page.getByRole('button', { name: 'Get Code' })).toBeVisible();
  });

  test('should reject invalid verification code', async ({ page }) => {
    const user = await prepareTrackedUser();
    await page.goto('/signup');

    await page.locator('#signupEmail').fill(user.email);
    await page.getByRole('button', { name: 'Get Code' }).click();

    await page.locator('#signupVerificationCode').fill('000000');
    await page.locator('#signupFullName').fill(user.fullName);
    await page.locator('#signupUsername').fill(user.username);
    await page.locator('#signupPassword').fill(user.password);

    await page.locator('#signupTerms').check();
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page.getByText(/invalid or expired verification code/i)).toBeVisible({ timeout: 15000 });
  });

  test('should allow full signup flow', async ({ page }) => {
    const user = await prepareTrackedUser();
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

    const signUp = await submitAuthForm(page, 'Sign Up', '/api/sign_up');
    expect(signUp.result).toBe(0);
    await expect(page).toHaveURL(/\/signin/);
  });

  test('should show error for invalid password sign-in', async ({ page }) => {
    await page.route('**/api/sign_in', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: 1, msg: 'Invalid credentials' }),
      });
    });

    await page.goto('/signin');
    await page.locator('#signinIdentifier').fill('bad@example.com');
    await page.locator('#signinPassword').fill('badpassword');
    await page.locator('#signinTerms').check();
    await page.getByRole('button', { name: 'Enter' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('should follow Create Account and Forgot Password links', async ({ page }) => {
    await page.goto('/signin');
    await page.getByRole('link', { name: 'Create Account' }).click();
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible();

    await page.goto('/signin');
    await page.getByRole('link', { name: 'Forgot Password?' }).click();
    await expect(page).toHaveURL(/\/change-password/);
    await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();
  });

  test('should open terms and privacy links from sign-in', async ({ page }) => {
    await page.goto('/signin');
    const signInTerms = page.getByRole('link', { name: 'Terms of Service' });
    const signInPrivacy = page.getByRole('link', { name: 'Privacy Policy' });
    const signInCookies = page.getByRole('link', { name: 'Cookie Policy' });
    await expect(signInTerms).toHaveAttribute('href', 'https://sokoyuku.com/legal/terms');
    await expect(signInPrivacy).toHaveAttribute('href', 'https://sokoyuku.com/legal/privacy');
    await expect(signInCookies).toHaveAttribute('href', 'https://sokoyuku.com/legal/cookies');
    await expect(signInTerms).toHaveAttribute('target', '_blank');
    await expect(signInPrivacy).toHaveAttribute('target', '_blank');
    await expect(signInCookies).toHaveAttribute('target', '_blank');

    await page.goto('/signup');
    const signUpTerms = page.getByRole('link', { name: 'Terms of Service' });
    const signUpPrivacy = page.getByRole('link', { name: 'Privacy Policy' });
    const signUpCookies = page.getByRole('link', { name: 'Cookie Policy' });
    await expect(signUpTerms).toHaveAttribute('href', 'https://sokoyuku.com/legal/terms');
    await expect(signUpPrivacy).toHaveAttribute('href', 'https://sokoyuku.com/legal/privacy');
    await expect(signUpCookies).toHaveAttribute('href', 'https://sokoyuku.com/legal/cookies');
    await expect(signUpTerms).toHaveAttribute('target', '_blank');
    await expect(signUpPrivacy).toHaveAttribute('target', '_blank');
    await expect(signUpCookies).toHaveAttribute('target', '_blank');
  });

  test('should localize legal agreement links', async ({ page }) => {
    await page.goto('/signin');
    const picker = page.locator('.language-picker.floating');
    await picker.getByRole('button', { name: 'Language' }).click();
    await picker.getByRole('option', { name: '日本語' }).click();
    await expect(page.getByRole('link', { name: '利用規約' })).toHaveAttribute('href', 'https://sokoyuku.com/legal/terms');
    await expect(page.getByRole('link', { name: 'プライバシーポリシー' })).toHaveAttribute('href', 'https://sokoyuku.com/legal/privacy');
    await expect(page.getByRole('link', { name: 'Cookieポリシー' })).toHaveAttribute('href', 'https://sokoyuku.com/legal/cookies');
    await expect(page.getByText('を読み、同意します。')).toBeVisible();

    await picker.getByRole('button', { name: '言語' }).click();
    await picker.getByRole('option', { name: '简体中文' }).click();
    await expect(page.getByRole('link', { name: '服务条款' })).toBeVisible();
    await expect(page.getByRole('link', { name: '隐私政策' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cookie 政策' })).toBeVisible();

    await picker.getByRole('button', { name: '语言' }).click();
    await picker.getByRole('option', { name: '繁體中文' }).click();
    await expect(page.getByRole('link', { name: '服務條款' })).toBeVisible();
    await expect(page.getByRole('link', { name: '隱私權政策' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cookie 政策' })).toBeVisible();
  });

  test('should reject unavailable username on blur', async ({ page }) => {
    await page.route('**/api/check_username', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: 1, msg: 'Username already exists' }),
      });
    });
    await page.goto('/signup');
    await page.locator('#signupUsername').fill('admin');
    await page.locator('#signupEmail').click();
    await expect(page.getByText('This username is not available')).toBeVisible({ timeout: 15000 });
  });
});
