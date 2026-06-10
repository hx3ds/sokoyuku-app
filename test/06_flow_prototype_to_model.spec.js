import { test, expect } from '@playwright/test';
import { uniqueSuffix } from './utils.js';

test.describe('Prototype to Model Flow', () => {
  test('should create prototype, find it in explore, add to models, and delete', async ({ page }) => {
    const suffix = uniqueSuffix();
    const protoName = `E2E Proto ${suffix}`;
    const protoDesc = `Test Description ${suffix}`;

    // 1. Create Prototype
    await page.goto('/my-prototypes');
    await expect(page).toHaveURL(/\/my-prototypes/);

    // Open Add Modal
    await page.locator('#page-my-prototypes').getByRole('button', { name: 'Create Prototype' }).click();

    // Verify Modal
    await expect(page.getByRole('heading', { name: 'Create New Prototype' })).toBeVisible();

    // Fill Form
    await page.getByPlaceholder('e.g. my-awesome-account').fill(protoName);
    await page.getByPlaceholder('e.g. https://example.com').fill('https://tgbd.sokoyuku.com');
    await page.getByPlaceholder('e.g. /my-account').fill('prototypes.passive');
    await page.getByPlaceholder('Describe what this prototype does...').fill(protoDesc);

    // Submit
    await page.locator('.dialog-wrapper').getByRole('button', { name: 'Create Prototype' }).click();

    await expect(page.getByRole('heading', { name: 'Create New Prototype' })).toBeHidden({ timeout: 15000 });
    await expect(page.getByText(protoName)).toBeVisible();

    // 2. Find in Explore
    await page.goto('/explore');
    
    // Search
    await page.getByPlaceholder('Search prototypes...').fill(protoName);

    // Verify result
    await expect(page.getByText(protoName)).toBeVisible();

    // 3. Add to My Models
    const item = page.locator('.list-item').filter({ hasText: protoName });
    await item.locator('.actions').getByRole('button', { name: 'Add to my models' }).click();

    // 4. Verify Model
    await page.goto('/models');
    await expect(page.getByText(protoName)).toBeVisible();

    // 5. Cleanup - Delete Model
    const modelItem = page.locator('.list-item').filter({ hasText: protoName }).first();
    
    await modelItem.getByRole('button', { name: 'Options' }).click();
    
    await page.getByText('Delete').click();
    
    // Confirm dialog
    await page.getByRole('button', { name: 'OK' }).click();

    // Verify deleted from models
    await page.reload();
    await expect(page.locator('.list-item').filter({ hasText: protoName })).toHaveCount(0);

    // 6. Cleanup - Delete Prototype
    await page.goto('/my-prototypes');
    const protoItem = page.locator('.list-item').filter({ hasText: protoName }).first();
    
    await protoItem.getByRole('button', { name: 'Options' }).click();
    
    await page.getByText('Delete').click();
    
    // Confirm
    await page.getByRole('button', { name: 'OK' }).click();

    // Verify deleted from prototypes
    await page.reload();
    await expect(page.locator('.list-item').filter({ hasText: protoName })).toHaveCount(0);
  });
});
