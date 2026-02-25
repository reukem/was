from playwright.sync_api import sync_playwright
import time

def verify(page):
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    print("Navigating to app...")
    page.goto("http://localhost:3000")
    # Wait for the app to load
    # Fallback to content check if selector fails (sometimes text nodes are weird)
    try:
        page.wait_for_selector("h1:has-text('CHEMIC-AI')", timeout=10000)
    except:
        content = page.content()
        if "CHEMIC-AI" in content:
            print("CHEMIC-AI found in HTML content (selector failed).")
        else:
            print("Timeout waiting for CHEMIC-AI. App might not have loaded.")
            print(content[:1000]) # Print start of content
            return

    print("CHEMIC-AI loaded.")

    # Check z-index of the LabUI container
    # Try to find the container with z-[999999] class directly
    lab_ui_root = page.locator("div.z-\\[999999\\]")
    if lab_ui_root.count() > 0:
        print("Found container with z-[999999] class.")
        # Get computed style to be sure
        z_index = lab_ui_root.first.evaluate("el => window.getComputedStyle(el).zIndex")
        print(f"Computed z-index: {z_index}")
    else:
        print("Could not find container with z-[999999] class via selector.")

    # Check for avatar image
    avatar = page.locator('img[src="/lucy_avatar.png"]')
    if avatar.count() > 0:
        print("Avatar found.")
    else:
        print("ERROR: Avatar not found.")

    # Screenshot
    page.screenshot(path="verification_ui.png")
    print("Screenshot saved to verification_ui.png")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    try:
        verify(page)
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification_error.png")
    finally:
        browser.close()
