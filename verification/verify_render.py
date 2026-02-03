from playwright.sync_api import Page, expect, sync_playwright
import time
from PIL import Image

def test_rendering(page: Page):
    print("Navigating...")
    try:
        page.goto("http://localhost:3005/", timeout=60000)
    except Exception as e:
        print(f"Navigation failed: {e}")
        return

    print("Waiting for canvas...")
    try:
        page.wait_for_selector("canvas", timeout=10000)
    except Exception as e:
        print(f"Timeout waiting for canvas. Page content:\n{page.content()[:500]}...")
        raise e

    # Give it time to render the first frame
    time.sleep(2)

    screenshot_path = "verification/render_check.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

    # Pixel analysis
    img = Image.open(screenshot_path)
    width, height = img.size

    black_pixel_count = 0
    total_samples = 100

    import random
    for _ in range(total_samples):
        x = random.randint(0, width - 1)
        y = random.randint(0, height - 1)
        pixel = img.getpixel((x, y))
        # Assuming black is (0, 0, 0) or very close
        if pixel[0] < 15 and pixel[1] < 15 and pixel[2] < 15:
            black_pixel_count += 1

    print(f"Black pixel percentage estimate: {black_pixel_count}%")

    if black_pixel_count > 90:
        raise Exception("Screen appears to be mostly black! Rendering might have failed.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_rendering(page)
        finally:
            browser.close()
