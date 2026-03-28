import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the local server
        await page.goto("http://localhost:3000")

        # Wait for 3D scene to load and stabilize
        print("Waiting for scene to stabilize...")
        await asyncio.sleep(8)

        # Take a screenshot
        await page.screenshot(path="transparency_check_final.png")
        print("Screenshot saved to transparency_check_final.png")

        await browser.close()

asyncio.run(run())