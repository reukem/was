## 2026-02-16 - Iframe Sandbox Escape via Same-Origin Access
**Vulnerability:** The `ArtifactCard` component used `sandbox="allow-same-origin"` for rendering potentially untrusted AI-generated content, allowing potential XSS attacks to access parent context (e.g., cookies, local storage).
**Learning:** Allowing same-origin access defeats the primary purpose of sandboxing untrusted content. For components designed to render user or AI-generated artifacts, strict isolation is critical.
**Prevention:** Always omit `allow-same-origin` unless strictly necessary for specific same-origin resource access. Use `postMessage` for communication instead.
