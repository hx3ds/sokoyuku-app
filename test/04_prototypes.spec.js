import { test, expect } from '@playwright/test';

test.describe('Prototypes', () => {
  test('should explore prototypes', async ({ page }) => {
    await page.goto('/explore');
    await expect(page).toHaveURL(/\/explore/);
    
    // Check for search bar
    await expect(page.getByPlaceholder('Search prototypes...')).toBeVisible();
    
    // Check if prototypes list container exists or "No prototypes found"
    // Since we don't know the state, we check for common elements
    // The search input is a good indicator of the page load
    await expect(page.locator('.search-input')).toBeVisible();
  });
});
