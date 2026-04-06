## 2024-04-06 - Prevent HTTP Parameter Injection in Dynamic API URLs
**Vulnerability:** API key injected directly into a fetch URL without URL encoding (`?key=${this.apiKey}`).
**Learning:** Even user-provided keys from BYOK setups can contain special characters (like `&`, `=`, or `#`) which can manipulate the URL structure, leading to parameter injection or malformed requests.
**Prevention:** Always wrap dynamically injected URL parameters with `encodeURIComponent()`.
