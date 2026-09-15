import { test, expect } from './fixtures.js';
import { addToMyModels, cleanupModelByName, cleanupPrototypeByName, uniqueSuffix } from './utils.js';

test.describe('Prototype to Model Flow', () => {
  test('should create prototype, find it in explore, add to models, and delete', async ({ page }) => {
    const suffix = uniqueSuffix();
    const protoName = `E2E Proto ${suffix}`;
    const protoDesc = `Test Description ${suffix}`;

    try {
      await page.goto('/my-prototypes');
      await expect(page).toHaveURL(/\/my-prototypes/);

      await page.locator('#page-my-prototypes').getByRole('button', { name: 'Create Prototype' }).click();
      await expect(page.getByRole('heading', { name: 'Create New Prototype' })).toBeVisible();

      await page.getByPlaceholder('e.g. my-awesome-account').fill(protoName);
      await page.getByPlaceholder('e.g. https://example.com').fill('https://tgbd.sokoyuku.com');
      await page.getByPlaceholder('e.g. /my-account').fill('prototypes.passive');
      await page.getByPlaceholder('Describe what this prototype does...').fill(protoDesc);

      await page.locator('.dialog-wrapper').getByRole('button', { name: 'Create Prototype' }).click();

      await expect(page.getByRole('heading', { name: 'Create New Prototype' })).toBeHidden({ timeout: 15000 });
      await expect(page.getByText(protoName)).toBeVisible();

      await page.goto('/explore');
      await page.getByPlaceholder('Search prototypes...').fill(protoName);
      await expect(page.getByText(protoName)).toBeVisible();

      const item = page.locator('.list-item').filter({ hasText: protoName });
      await addToMyModels(page, item.locator('.actions'));

      await page.goto('/models');
      await expect(page.getByText(protoName)).toBeVisible({ timeout: 15000 });

      const modelItem = page.locator('.list-item').filter({ hasText: protoName }).first();
      await modelItem.getByRole('button', { name: 'Options' }).click();
      await page.getByText('Delete', { exact: true }).click();
      await page.getByRole('button', { name: 'OK' }).click();
      await expect(page.locator('.list-item').filter({ hasText: protoName })).toHaveCount(0, {
        timeout: 15000,
      });

      await page.goto('/my-prototypes');
      const protoItem = page.locator('.list-item').filter({ hasText: protoName }).first();
      await expect(protoItem).toBeVisible();
      await protoItem.getByRole('button', { name: 'Options' }).click();
      await page.getByText('Delete', { exact: true }).click();
      await page.getByRole('button', { name: 'OK' }).click();
      await expect(page.locator('.list-item').filter({ hasText: protoName })).toHaveCount(0, {
        timeout: 15000,
      });
    } finally {
      await cleanupModelByName(page, protoName);
      await cleanupPrototypeByName(page, protoName);
    }
  });
});
