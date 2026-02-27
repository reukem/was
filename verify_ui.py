import time
from playwright.sync_api import sync_playwright

def verify_ui():
    print("Starting UI verification...")
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Navigate to app
        print("Navigating to app...")
        page.goto("http://localhost:3000")

        # Wait for loading
        print("Waiting for load...")
        page.wait_for_timeout(5000)

        # 1. Verify Collapsed State
        print("Verifying collapsed state...")
        # Check for the header text
        page.wait_for_selector("text=Liên Lạc - GIÁO SƯ LUCY")
        # Take screenshot of collapsed state
        page.screenshot(path="verification_collapsed.png")
        print("Collapsed screenshot saved.")

        # 2. Verify Expanded State (Click to Toggle)
        print("Clicking to expand...")
        # Click the header area (using text locator as anchor)
        page.click("text=Liên Lạc - GIÁO SƯ LUCY")
        # Wait for transition
        page.wait_for_timeout(1000)

        # Check for input field visibility
        if page.is_visible("input[placeholder='Hỏi Lucy...']"):
            print("Chat input is visible.")
        else:
            print("ERROR: Chat input not visible!")

        # Take screenshot of expanded state
        page.screenshot(path="verification_expanded.png")
        print("Expanded screenshot saved.")

        # 3. Verify Auto-Expand (Simulate User Input)
        print("Testing chat interaction...")
        page.fill("input[placeholder='Hỏi Lucy...']", "Hello Lucy")
        page.press("input[placeholder='Hỏi Lucy...']", "Enter")

        # Wait for AI response (simulated or real)
        page.wait_for_timeout(2000)
        page.screenshot(path="verification_chatting.png")
        print("Chatting screenshot saved.")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    verify_ui()
