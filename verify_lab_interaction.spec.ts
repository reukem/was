import { test, expect } from '@playwright/test';

test('Verify Lab Interaction (AAA Mode)', async ({ page }) => {
  // Listen for console logs
  page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

  console.log('Navigating to http://localhost:3000/...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  // Wait for the app to be ready (e.g., look for "CHEMIC-AI" title)
  const titleLocator = page.locator('text=CHEMIC-AI');
  await titleLocator.waitFor({ state: 'visible', timeout: 30000 });
  console.log('App loaded.');

  // Verify AAA Mode Badge is present
  const aaaBadge = page.locator('text=AAA').first();
  await expect(aaaBadge).toBeVisible();

  // Verify Safe Mode Badge
  const safeModeBadge = page.locator('text=AN TOÀN').first();
  await expect(safeModeBadge).toBeVisible();

  // Verify Professor Lucy Header
  const professorHeader = page.getByRole('heading', { name: 'Professor Lucy', exact: true });
  await expect(professorHeader).toBeVisible();

  // Verify Canvas
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  console.log('AAA Mode Verified.');
});
