import { test, expect } from '@playwright/test';

test('Verify Lab UI Elements', async ({ page }) => {
  // Listen for console logs
  page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

  console.log('Navigating to http://localhost:3000/...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  // Wait for the app to be ready
  const titleLocator = page.locator('text=CHEMIC-AI');
  await titleLocator.waitFor({ state: 'visible', timeout: 30000 });
  console.log('App loaded.');

  // Check for new UI elements
  await expect(page.locator('text=QUANTUM REALITY ENGINE')).toBeVisible();
  await expect(page.locator('text=Active Protocols')).toBeVisible();
  await expect(page.locator('text=Professor Lucy')).toBeVisible();

  // Check that the Canvas is present
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  console.log('UI Verification Complete.');
});
