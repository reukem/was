from playwright.sync_api import sync_playwright, expect
import os

def test_security():
    os.makedirs("/app/verification/video", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/app/verification/video")
        page = context.new_page()

        try:
            page.goto("http://localhost:3000/")
            page.wait_for_timeout(2000)

            # 1. Test Chat Input max length & disabled state
            chat_input = page.locator("input[placeholder='Hỏi Lucy...']")
            chat_input.wait_for(state="visible")

            # Type more than 200 characters
            long_text = "a" * 250
            chat_input.fill(long_text)
            page.wait_for_timeout(500)

            # Assert it's truncated to 200 characters
            actual_value = chat_input.input_value()
            assert len(actual_value) == 200, f"Chat input length is {len(actual_value)}, expected 200"

            # Hit enter
            chat_input.press("Enter")
            page.wait_for_timeout(100)

            # Input should be disabled while AI is "loading"
            assert chat_input.is_disabled() == True, "Chat input should be disabled during submit"
            page.wait_for_timeout(1000) # Wait for AI response to finish

            # 2. Test Settings Input max length
            settings_button = page.locator("button:has-text('⚙️')")
            settings_button.click()
            page.wait_for_timeout(500)

            settings_input = page.locator("input[placeholder='AIzaSy...']")
            settings_input.wait_for(state="visible")

            # Type more than 100 characters
            long_key = "b" * 150
            settings_input.fill(long_key)
            page.wait_for_timeout(500)

            actual_key = settings_input.input_value()
            assert len(actual_key) == 100, f"Settings input length is {len(actual_key)}, expected 100"

            page.screenshot(path="/app/verification/security_verified.png")
            page.wait_for_timeout(500)

            print("Verification successful!")

        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    test_security()
