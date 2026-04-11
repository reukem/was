## 2024-10-24 - Prevent HTTP Parameter Injection in URL Queries
**Vulnerability:** The application constructed the Gemini API endpoint URL by directly interpolating the `apiKey` (which is user-configurable via `localStorage`) without encoding it, creating an HTTP parameter injection vulnerability.
**Learning:** Even when reading from local configuration or secrets, any string interpolated into a URL query string can be manipulated to alter the request structure (e.g., injecting additional parameters using `&`) if not properly encoded.
**Prevention:** Always wrap dynamically injected URL parameters with `encodeURIComponent` before embedding them into the URL string.
