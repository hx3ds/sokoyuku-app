import { test, expect } from '@playwright/test';
import { uniqueSuffix } from './utils.js';

test.describe('Explore Page', () => {
  test('should search and find a created prototype', async ({ page }) => {
    const suffix = uniqueSuffix();
    const protoName = `E2E Explore ${suffix}`;
    const protoDesc = `Explore description ${suffix}`;

    await page.goto('/my-prototypes');
    await page.locator('#page-my-prototypes').getByRole('button', { name: 'Create Prototype' }).click();
    await expect(page.getByRole('heading', { name: 'Create New Prototype' })).toBeVisible();

    await page.getByPlaceholder('e.g. my-awesome-account').fill(protoName);
    await page.getByPlaceholder('e.g. https://example.com').fill('https://tgbd.sokoyuku.com');
    await page.getByPlaceholder('e.g. /my-account').fill('prototypes.passive');
    await page.getByPlaceholder('Describe what this prototype does...').fill(protoDesc);
    await page.locator('.dialog-wrapper').getByRole('button', { name: 'Create Prototype' }).click();
    await expect(page.getByRole('heading', { name: 'Create New Prototype' })).toBeHidden({ timeout: 15000 });

    await page.goto('/explore');
    await page.getByPlaceholder('Search prototypes...').fill(protoName);
    await expect(page.getByText(protoName)).toBeVisible();

    await page.goto('/my-prototypes');
    const protoItem = page.locator('.list-item').filter({ hasText: protoName }).first();
    await protoItem.getByRole('button', { name: 'Options' }).click();
    await page.getByText('Delete').click();
    await page.getByRole('button', { name: 'OK' }).click();

    await expect(page.getByText(protoName)).toBeHidden();
  });
});
