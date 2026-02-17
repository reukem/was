import time
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.set_default_timeout(60000) # 60 seconds

    print("Navigating to app...")
    page.goto("http://localhost:5173", timeout=60000)

    # Wait for the app to load
    try:
        print("Waiting for CHEMIC-AI text...")
        page.wait_for_selector("text=CHEMIC-AI", timeout=60000)
        print("App loaded.")
    except Exception as e:
        print(f"Timeout waiting for CHEMIC-AI text: {e}")
        try:
            page.screenshot(path="debug_timeout.png", timeout=10000)
        except:
            print("Failed to take debug screenshot.")
        browser.close()
        return

    # 1. Verify Graphics Toggle
    # Start with AAA
    toggle_aaa = page.get_by_role("button", name="AAA")

    # Try locating either AAA or FAST
    if toggle_aaa.is_visible():
        print("Found 'AAA' button. Clicking...")
        toggle_aaa.click()

        # Should become FAST
        toggle_fast = page.get_by_role("button", name="FAST")
        expect(toggle_fast).to_be_visible()
        print("Button changed to 'FAST'.")

        # Click back
        toggle_fast.click()
        expect(toggle_aaa).to_be_visible()
        print("Button changed back to 'AAA'.")
    else:
        # Maybe starts as FAST?
        toggle_fast = page.get_by_role("button", name="FAST")
        if toggle_fast.is_visible():
            print("Found 'FAST' button. Clicking...")
            toggle_fast.click()
            expect(toggle_aaa).to_be_visible()
            print("Button changed to 'AAA'.")
        else:
            print("Graphics Toggle NOT found.")
            # Screenshot for debugging
            page.screenshot(path="debug_notfound.png")

    # 2. Verify Report Export
    report_btn = page.locator("button[title='Xuất Báo Cáo']")
    if report_btn.is_visible():
        print("Report Button found.")

        # Handle Prompts
        def handle_dialog(dialog):
            print(f"Dialog: {dialog.message}")
            dialog.accept("Test User")

        page.on("dialog", handle_dialog)

        # Handle Popup (New Window)
        with context.expect_page() as new_page_info:
            report_btn.click()

        report_page = new_page_info.value
        report_page.wait_for_load_state()
        print(f"Report Page Title: {report_page.title()}")

        # Wait for content to render
        time.sleep(2)

        # Take screenshot of the report
        try:
            report_page.screenshot(path="verification_report.png")
            print("Screenshot of report saved to verification_report.png")
        except:
            print("Failed to screenshot report page.")

        report_page.close()
    else:
        print("Report Button NOT found.")

    # Screenshot of main app
    try:
        page.screenshot(path="verification_app.png")
        print("Screenshot of app saved to verification_app.png")
    except:
        print("Failed to screenshot app page.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
