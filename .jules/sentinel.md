## 2024-05-18 - HTTP Parameter Injection via API Key and Missing Input Length Limits
**Vulnerability:** The Gemini API key from local storage was interpolated directly into the `fetch` request URL, risking HTTP parameter injection. Input fields also lacked `maxLength` limits, presenting a client-side DoS risk.
**Learning:** Client-side secrets from storage must be treated as untrusted input when building URLs. Generously scoped text inputs can lead to memory exhaustion.
**Prevention:** Always wrap dynamically injected URL parameters with `encodeURIComponent`. Apply explicit `maxLength` constraints to all user inputs (e.g., 50,000 for chat, 200 for settings).
