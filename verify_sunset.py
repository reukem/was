
import time
from playwright.sync_api import sync_playwright

def verify_sunset_theme():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to http://localhost:3000...")
        page.goto("http://localhost:3000")

        # Wait for the main container or canvas to be present
        print("Waiting for application to load...")
        try:
            page.wait_for_selector("canvas", timeout=60000)
            print("Canvas detected.")
        except Exception as e:
            print(f"Error waiting for canvas: {e}")
            # Fallback: just wait a bit if selector fails, though it shouldn't

        # Generous sleep to allow 3D scene, shaders, and post-processing (Bloom) to fully render
        # as per memory instructions for Three.js scenes
        print("Sleeping for 15s to allow 3D scene stabilization...")
        time.sleep(15)

        # Take a full page screenshot
        output_path = "verification_sunset.png"
        page.screenshot(path=output_path, full_page=True)
        print(f"Screenshot saved to {output_path}")

        browser.close()

if __name__ == "__main__":
    verify_sunset_theme()
