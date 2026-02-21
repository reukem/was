from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Console logging
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

    page.goto("http://localhost:3000/")

    # Wait for loading
    try:
        page.wait_for_selector("text=CHEMIC-AI", timeout=10000)
        print("Page loaded")
    except:
        print("Timeout waiting for page load")
        page.screenshot(path="debug_load_fail.png")
        browser.close()
        return

    # Screenshot initial state
    page.screenshot(path="debug_initial.png")

    # 1. Verify Quest Log is open
    expect_quest_log = page.get_by_text("Nhiệm Vụ Hiện Tại")
    if expect_quest_log.is_visible():
        print("Quest Log is initially visible")
    else:
        print("Quest Log NOT visible initially")

    # 2. Close Quest Log
    close_btn = page.get_by_role("button", name="✕").first
    # Force click
    try:
        close_btn.click(timeout=5000, force=True)
        print("Clicked close button (forced)")
    except Exception as e:
        print(f"Failed to click close button: {e}")
        page.screenshot(path="debug_click_fail.png")

    page.wait_for_timeout(1000)
    page.screenshot(path="debug_closed.png")

    # 3. Verify Reopen Button
    reopen_btn = page.get_by_role("button", name="📋 Nhiệm Vụ")
    if reopen_btn.is_visible():
        print("Reopen button is visible")
        pe = reopen_btn.evaluate("element => getComputedStyle(element).pointerEvents")
        print(f"Reopen button pointer-events: {pe}")
    else:
        print("FAIL: Reopen button NOT visible")

    # 4. Settings Modal
    settings_btn = page.get_by_title("Settings (API Key)")
    try:
        settings_btn.click(timeout=5000, force=True)
        print("Clicked Settings button")
    except Exception as e:
        print(f"Failed to click settings button: {e}")

    page.wait_for_timeout(500)

    modal_title = page.get_by_text("SYSTEM SETTINGS")
    if modal_title.is_visible():
        print("Settings Modal is visible")
        # Find wrapper: h2 -> div -> div (wrapper)
        # We need to be careful with locator.
        # Let's target the wrapper by class if possible, but class names are long tailwind strings.
        # Just check the parent of the modal content.
        # Modal content has class "bg-[#0f172a]/90 ..."
        content_div = page.locator("div.bg-\\[\\#0f172a\\]\\/90")
        if content_div.count() > 0:
            wrapper = content_div.first.locator("xpath=..")
            wrapper_pe = wrapper.evaluate("element => getComputedStyle(element).pointerEvents")
            print(f"Settings Modal wrapper pointer-events: {wrapper_pe}")
        else:
            print("Could not locate modal content div")

    else:
        print("FAIL: Settings Modal NOT visible")
        page.screenshot(path="debug_modal_fail.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
