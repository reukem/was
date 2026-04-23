## 2025-04-05 - Fix HTTP parameter injection in BYOK API Key
**Vulnerability:** User-provided BYOK API keys were directly interpolated into the fetch URL query string without encoding, risking HTTP parameter injection.
**Learning:** Even internal API keys stored in `localStorage` must be treated as untrusted user input when injected into URLs.
**Prevention:** Always wrap dynamically injected URL parameters with `encodeURIComponent`, especially for sensitive or user-controlled values.
