import time
from playwright.sync_api import sync_playwright

def verify_visuals():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a larger viewport to see more detail
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:3000")

        # Wait for canvas to be present
        page.wait_for_selector("canvas", timeout=60000)

        # Wait for scene to stabilize
        print("Waiting for scene to stabilize...")
        time.sleep(10)

        # Spawn Sodium (Solid Rock)
        print("Spawning Sodium...")
        page.get_by_text("Natri", exact=True).click()
        time.sleep(2)

        # Take screenshot of Sodium mesh
        page.screenshot(path="sodium_mesh.png")
        print("Sodium screenshot taken.")

        # Type in chat to test Gemini fallback
        print("Testing Chat...")
        page.get_by_placeholder("Hỏi Lucy...").fill("Hello Professor")
        page.get_by_placeholder("Hỏi Lucy...").press("Enter")
        time.sleep(5)

        # Capture Chat
        page.screenshot(path="chat_response.png")
        print("Chat screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_visuals()
