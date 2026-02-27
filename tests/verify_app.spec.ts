import { test, expect } from '@playwright/test';

test('Verify Transparency and Avatar', async ({ page }) => {
  // 1. Navigate to the app (using the port we know is open, 3000)
  await page.goto('http://localhost:3000');

  // 2. Wait for the canvas to be present (3D scene)
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 10000 });

  // 3. Wait a bit for the scene to render and the avatar to appear
  // This is a "wait" to ensure the WebGL initializes fully before screenshot.
  await page.waitForTimeout(5000);

  // 4. Verify the avatar image src
  const avatar = page.locator('img[alt="Prof Lucy"]');
  await expect(avatar).toBeVisible();
  // We check for the src ending in /lucy.png because absolute paths might differ
  await expect(avatar).toHaveAttribute('src', '/lucy.png');

  // 5. Take a screenshot to visually verify the background transparency
  // The screenshot should show the gradient background, not black.
  await page.screenshot({ path: 'verification_result.png', fullPage: true });
});
