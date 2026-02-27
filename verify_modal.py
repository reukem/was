
import time
from playwright.sync_api import sync_playwright

def verify_settings_modal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to http://localhost:3000...")
        page.goto("http://localhost:3000")

        # Wait for app load
        try:
            page.wait_for_selector("canvas", timeout=30000)
            print("App loaded.")
        except:
            print("Canvas wait timeout, proceeding...")

        # Find and click the settings button (gear icon)
        # Based on previous analysis, it's a button with '⚙️'
        print("Opening Settings Modal...")
        try:
            settings_btn = page.get_by_text("⚙️")
            if settings_btn.count() > 0:
                settings_btn.click()
                print("Settings button clicked.")
                time.sleep(2) # Animation wait
            else:
                print("Settings button not found!")
        except Exception as e:
            print(f"Error clicking settings: {e}")

        # Screenshot the modal
        output_path = "verification_settings_modal.png"
        page.screenshot(path=output_path, full_page=True)
        print(f"Screenshot saved to {output_path}")

        browser.close()

if __name__ == "__main__":
    verify_settings_modal()
