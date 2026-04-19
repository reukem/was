import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        await page.goto("http://localhost:5173")
        await page.wait_for_timeout(2000) # Give it time to render the 3D scene
        await page.screenshot(path="screenshot.png")
        await browser.close()

asyncio.run(main())