from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:3000/")

    try:
        page.wait_for_selector("text=CHEMIC-AI", timeout=10000)
    except:
        pass

    # Try Settings Button
    settings_btn = page.get_by_title("Settings (API Key)")
    if settings_btn.is_visible():
        print("Found Settings Button")
        settings_btn.click(timeout=5000)
        print("Clicked Settings Button")

        # Check if Modal appears
        modal_title = page.get_by_text("SYSTEM SETTINGS")
        if modal_title.is_visible():
            print("PASS: Settings Modal Opened")
        else:
            print("FAIL: Settings Modal did not open")

    else:
        print("FAIL: Settings Button not found")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
