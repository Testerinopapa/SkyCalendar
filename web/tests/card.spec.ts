import { test, expect } from '@playwright/test';

test.describe('PlanetInfoCard UI', () => {
  test('toggles sections independently', async ({ page }) => {
    await page.goto('/debug/card');
    // Space data toggle
    const spaceDataBtn = page.getByTestId('btn-space-data');
    await expect(spaceDataBtn).toBeVisible();
    await spaceDataBtn.click();
    await expect(page.getByText('Mean radius')).toBeVisible({ timeout: 15000 });
    // Space weather toggle
    const weatherBtn = page.getByTestId('btn-space-weather');
    await weatherBtn.click();
    await expect(page.getByTestId('section-space-weather')).toBeVisible();
    // Astronomy toggle
    const astronomyBtn = page.getByTestId('btn-astronomy');
    await astronomyBtn.click();
    await expect(page.getByTestId('section-astronomy')).toBeVisible();
  });
});


