import { test, expect } from './fixtures.js';
import { cleanupPrototypeByName, uniqueSuffix } from './utils.js';

test.describe('Explore Page', () => {
  test('should search and find a created prototype', async ({ page }) => {
    const suffix = uniqueSuffix();
    const protoName = `E2E Explore ${suffix}`;
    const protoDesc = `Explore description ${suffix}`;

    try {
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
    } finally {
      await cleanupPrototypeByName(page, protoName);
    }

    await page.goto('/my-prototypes');
    await expect(page.locator('.list-item').filter({ hasText: protoName })).toHaveCount(0);
  });
});
