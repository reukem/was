## 2026-04-09 - HTTP Parameter Injection via Unencoded API Key
**Vulnerability:** User-supplied API keys (BYOK from localStorage) were directly concatenated into the Gemini REST API fetch URL without encoding, creating an HTTP parameter injection vulnerability.
**Learning:** Even configuration values and credentials inputted by the user can be attack vectors if they are used to dynamically construct URLs.
**Prevention:** Always use `encodeURIComponent` when interpolating variables into URL query parameters, even for API keys.
