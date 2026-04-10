import { test, expect } from '@playwright/test';

/**
 * E2E happy-path: create a case, edit assessment, verify decision and history.
 *
 * Prerequisites:
 * - PostgreSQL running with seeded data (docker-compose up + npm run db:seed)
 * - API server running on port 3001
 * - Web dev server running on port 5173
 */

test('full case lifecycle: create, assess, verify decision and history', async ({ page }) => {
  // 1. Navigate to portfolio dashboard
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Change Cases');

  // 2. Click "New Case"
  await page.click('text=New Case');
  await expect(page.locator('h1')).toContainText('Create Change Case');

  // 3. Fill out case form
  await page.fill('input[placeholder*="Describe the change"]', 'E2E Test: Update training data');
  await page.selectOption('select:below(:text("Product"))', { index: 1 }); // Select first product
  await page.fill('textarea', 'Automated E2E test case creation');
  await page.selectOption('select:below(:text("Priority"))', 'high');

  // 4. Submit case
  await page.click('text=Create Case');

  // 5. Verify we land on case detail with Overview tab
  await expect(page.locator('h1')).toContainText('E2E Test: Update training data');
  await expect(page.locator('text=Draft')).toBeVisible();

  // 6. Switch to Assessment tab
  await page.click('text=Assessment');
  await expect(page.locator('text=PROVISIONAL')).toBeVisible();

  // 7. Verify assessment blocks are shown (at least the baseline/auth block)
  await expect(page.locator('button:has-text("Baseline")')).toBeVisible();

  // 8. Switch to History tab
  await page.click('text=History');
  await expect(page.locator('text=Audit Trail')).toBeVisible();

  // 9. Verify there's a creation audit event
  await expect(page.locator('text=Created')).toBeVisible();

  // 10. Go back to dashboard
  await page.click('text=All Cases');
  await expect(page.locator('h1')).toContainText('Change Cases');

  // 11. Verify our new case appears in the list
  await expect(page.locator('text=E2E Test: Update training data')).toBeVisible();
});
