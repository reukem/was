import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gl-drawing-for-tests']
  });
  const page = await browser.newPage();

  // Set viewport to a reasonable size
  await page.setViewportSize({ width: 1280, height: 720 });

  console.log('Navigating to app...');
  try {
    // Wait for the server to be ready (a simple sleep might be needed if it's slow to start)
    // but usually localhost:3000 is quick.
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Give Three.js and the canvas time to render and initialize
    console.log('Waiting for scene initialization...');
    await page.waitForTimeout(5000);

    // Take screenshot
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'verification_screenshot.png', fullPage: true });

    console.log('Screenshot saved to verification_screenshot.png');
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await browser.close();
  }
})();
