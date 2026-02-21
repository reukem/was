from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()

    print("Navigating to http://localhost:3000")
    page.goto("http://localhost:3000")

    print("Waiting for CHEMIC-AI title...")
    page.wait_for_selector("text=CHEMIC-AI")

    print("Taking screenshot of initial state...")
    page.screenshot(path="verification_app.png")

    # Try to toggle Performance Mode to AAA (force click)
    print("Toggling Performance Mode...")
    toggle_btn = page.get_by_role("button", name="⚡ FAST")
    if toggle_btn.is_visible():
        toggle_btn.evaluate("node => node.click()")
        # Wait a bit for render (even if it lags)
        page.wait_for_timeout(2000)
        page.screenshot(path="verification_aaa.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
