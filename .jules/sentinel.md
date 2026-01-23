# Sentinel Journal

## 2025-02-18 - XSS in ArtifactCard
**Vulnerability:** The `ArtifactCard` component uses an `iframe` with `srcDoc` and `sandbox="... allow-same-origin"`. This combination allows the sandboxed content (which is user/AI generated) to potentially access the parent application's origin (cookies, localStorage, DOM) if it manages to bypass other restrictions or if the browser treats `srcDoc` + `allow-same-origin` as sharing the origin.
**Learning:** `allow-same-origin` defeats the purpose of sandboxing untrusted content when using `srcDoc` or same-origin URLs. It should only be used when the content is trusted and needs access to the parent.
**Prevention:** Always audit `sandbox` attributes on iframes. Remove `allow-same-origin` for untrusted content. Use `postMessage` for communication if needed.
