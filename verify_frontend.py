import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    # Set viewport to a reasonable size
    page.set_viewport_size({"width": 1280, "height": 720})

    print("Navigating to http://localhost:3001/ ...")
    page.goto("http://localhost:3001/")

    # Wait for loading (give 3D scene time to render)
    time.sleep(5)

    # Check for static UI elements
    print("Checking for UI elements...")
    try:
        page.wait_for_selector("text=CHEMIC-AI", timeout=5000)
        print("Found CHEMIC-AI")
    except:
        print("CHEMIC-AI not found")

    try:
        page.wait_for_selector("text=KHO HÓA CHẤT", timeout=5000)
        print("Found KHO HÓA CHẤT")
    except:
        print("KHO HÓA CHẤT not found")

    try:
        # Note: 'TIẾN ĐỘ (3)' might be exact text match or contains
        page.wait_for_selector("text=TIẾN ĐỘ", timeout=5000)
        print("Found TIẾN ĐỘ")
    except:
        print("TIẾN ĐỘ not found")

    # Open Notebook
    try:
        # Notebook button is the book emoji
        # There are two buttons with book emoji, one in action deck (top right)
        # Check src/App.tsx: <button onClick={() => setIsNotebookOpen(true)} ...>📖</button>
        # The modal title is 'NHẬT KÝ THÍ NGHIỆM'

        # We need to target the button correctly.
        # Since emojis are text, "text=📖" works.
        page.click("text=📖")
        time.sleep(1)
        if page.is_visible("text=NHẬT KÝ THÍ NGHIỆM"):
             print("Notebook opened and verified: NHẬT KÝ THÍ NGHIỆM")
        else:
             print("Notebook failed to open or text mismatch")

        # Close modal (x button)
        page.click("button.text-slate-400")
        time.sleep(0.5)
    except Exception as e:
        print(f"Notebook check failed: {e}")

    # Open Settings
    try:
        # Settings button is gear emoji ⚙️
        page.click("text=⚙️")
        time.sleep(1)
        if page.is_visible("text=CÀI ĐẶT HỆ THỐNG"):
             print("Settings opened and verified: CÀI ĐẶT HỆ THỐNG")
        else:
             print("Settings failed to open or text mismatch")

        # Close settings
        page.click("text=HỦY")
    except Exception as e:
        print(f"Settings check failed: {e}")

    # Take screenshot for visual inspection of lighting
    page.screenshot(path="frontend_verification.png")
    print("Screenshot taken.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
