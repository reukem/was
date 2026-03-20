## 2024-03-20 - Prevent HTTP Parameter Injection in API URLs
**Vulnerability:** API key injected directly into fetch URL without URL encoding (`key=${this.apiKey}`). This allows HTTP parameter injection if the user-provided API key contains URL control characters (like `&`).
**Learning:** Even when the key is sourced locally (BYOK architecture) and not a direct attack vector against a server we own, it acts as user-controlled input. If passed directly into a URL, it can alter the intended API request structure or cause unexpected errors that might leak information.
**Prevention:** Always wrap dynamically injected URL parameters with `encodeURIComponent()`.
