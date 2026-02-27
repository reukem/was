
import time
from playwright.sync_api import sync_playwright

def verify_master_override():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:3000")

        # Wait for 3D scene to stabilize (important for GL rendering)
        print("Waiting for scene to stabilize...")
        time.sleep(10)

        # 1. Verify UI Elements (Master Override)
        # Check for Floating Avatar (Closed Chat State)
        try:
            floating_avatar = page.locator('img[alt="Open Chat"]')
            if floating_avatar.is_visible():
                print("SUCCESS: Floating avatar found (Chat closed by default).")
                # Open Chat
                print("Opening chat...")
                floating_avatar.click()
                time.sleep(1) # Wait for animation

                # Check for Close Button (X)
                close_btn = page.get_by_text("✕") # Try generic 'X' or '✕'
                if close_btn.count() > 0 and close_btn.first.is_visible():
                    print("SUCCESS: Chat close button found.")
                    close_btn.first.click()
                    time.sleep(1)
                    if floating_avatar.is_visible():
                        print("SUCCESS: Chat closed successfully.")
                else:
                    print("WARN: Could not find close button.")
            else:
                print("FAIL: Floating avatar not found.")
        except Exception as e:
            print(f"FAIL: Error verifyin UI: {e}")

        # 2. Verify 3D Assets (Visual Check via Screenshot)
        # Spawn Sodium (Rock)
        print("Spawning Sodium...")
        # Use exact text match or stricter locator to avoid ambiguity
        page.locator("button:has-text('Natri')").filter(has_text="Na").first.click()
        time.sleep(2)

        # Spawn Chlorine (Canister)
        print("Spawning Chlorine...")
        page.locator("button:has-text('Khí Clo')").first.click()
        time.sleep(2)

        print("Taking verification screenshot...")
        page.screenshot(path="verification_master.png")

        browser.close()

if __name__ == "__main__":
    verify_master_override()
