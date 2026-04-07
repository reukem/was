## 2026-04-07 - Prevent HTTP Parameter Injection in API Keys
**Vulnerability:** The Gemini API key retrieved from local storage (user input) was directly interpolated into the fetch URL without URL encoding, exposing the application to HTTP parameter injection.
**Learning:** Even when inputs are expected to be specific formats (like API keys), they must be treated as untrusted user input when injected into URLs or queries.
**Prevention:** Always use `encodeURIComponent()` when dynamically inserting variables into URL query parameters to ensure control characters are safely escaped.
