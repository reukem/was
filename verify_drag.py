import time
from playwright.sync_api import sync_playwright

def verify_drag():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:3000")

        # Wait for canvas to be present
        page.wait_for_selector("canvas", timeout=60000)

        # Wait for scene to stabilize (10s as per memory)
        print("Waiting for scene to stabilize...")
        time.sleep(10)

        # Take initial screenshot
        page.screenshot(path="before_drag.png")
        print("Initial screenshot taken.")

        # Simulate Drag
        # Beaker 1 is at [-1.5, 0.42, 0] in 3D space.
        # In a 1280x720 window, with default camera, we need to estimate screen coords.
        # Or we can blindly drag from left-center to right-center.

        # Center of screen is (640, 360).
        # Beaker 1 is likely to the left.

        # Let's try a sweep drag to catch something.
        start_x = 400
        start_y = 500
        end_x = 800
        end_y = 500

        print(f"Attempting drag from {start_x},{start_y} to {end_x},{end_y}")

        page.mouse.move(start_x, start_y)
        page.mouse.down()
        time.sleep(1) # Hold
        page.mouse.move(end_x, end_y, steps=20)
        time.sleep(1) # Hold at target
        page.mouse.up()

        print("Drag complete. Waiting for potential reaction/settling...")
        time.sleep(5)

        # Take final screenshot
        page.screenshot(path="after_drag.png")
        print("Final screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_drag()
