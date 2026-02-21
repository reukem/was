from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:3000/")

    try:
        page.wait_for_selector("text=CHEMIC-AI", timeout=10000)
    except:
        pass

    # Find Close Button
    close_btn = page.get_by_role("button", name="✕").first
    if close_btn.is_visible():
        print("Found Close Button")
        # Try clicking via dispatchEvent
        close_btn.dispatch_event("click")
        print("Dispatched click event")

        page.wait_for_timeout(2000) # Wait for state update and transition

        # Check wrapper style
        # Find wrapper by finding parent of "Nhiệm Vụ Hiện Tại" text?
        # But if closed, text might be hidden (opacity 0)?
        # If opacity 0, is_visible() returns false?
        # But elements are still in DOM.
        wrapper = page.locator("div.transition-all").filter(has_text="Nhiệm Vụ Hiện Tại").first

        # Check computed style
        pe = wrapper.evaluate("element => getComputedStyle(element).pointerEvents")
        print(f"Wrapper pointer-events after click: {pe}")

        opacity = wrapper.evaluate("element => getComputedStyle(element).opacity")
        print(f"Wrapper opacity after click: {opacity}")

        if pe == 'none':
            print("PASS: Wrapper is pointer-events-none")
        elif pe == 'auto' and opacity == '0':
            print("FAIL: Wrapper is transparent but still pointer-events-auto!")
        elif pe == 'auto' and opacity == '1':
             print("FAIL: Click didn't close the log (opacity 1)")
        else:
             print(f"FAIL: Unexpected state: pe={pe}, opacity={opacity}")

    else:
        print("Could not find Close Button")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
