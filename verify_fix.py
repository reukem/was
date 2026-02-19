from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            print("Navigating to http://localhost:3000")
            page.goto("http://localhost:3000")

            # Click the start button
            print("Waiting for BOOT_SEQUENCE button...")
            start_btn = page.get_by_text("BOOT_SEQUENCE")
            start_btn.click()

            # Wait for the log panel to appear
            print("Waiting for log-panel...")
            page.wait_for_selector(".log-panel", timeout=10000)

            # Take a screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification.png")

            # Check content
            logs = page.locator(".log-entry").all_text_contents()
            print("Logs found:", logs)

            # Verify that logs start with "> "
            correct_count = 0
            for log in logs:
                if not log.strip().startswith("> "):
                    print(f"WARNING: Log entry '{log}' does not start with '> '")
                else:
                    print(f"Log entry '{log}' is correct.")
                    correct_count += 1

            if correct_count == len(logs) and correct_count > 0:
                print("SUCCESS: All logs are correct.")
            else:
                print("FAILURE: Some logs are incorrect or missing.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
