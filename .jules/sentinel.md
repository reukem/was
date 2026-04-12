## 2024-04-12 - HTTP Parameter Injection & DoS Vector
**Vulnerability:** Unsanitized user-provided API key from localStorage was interpolated directly into the Gemini API URL string, opening the door to HTTP parameter injection. Additionally, text inputs lacked length limits, enabling client-side Denial of Service via massive text pasting.
**Learning:** Even when reading secrets from local storage or user configuration, any value appended to a URL must be URL-encoded to ensure attackers (or malformed inputs) cannot inject unexpected query parameters. Furthermore, unbounded input fields pose a performance risk in the browser.
**Prevention:** Always wrap dynamically injected URL variables with `encodeURIComponent()` and enforce sensible `maxLength` attributes on all UI inputs.
