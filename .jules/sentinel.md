# Sentinel's Journal

## 2025-02-19 - Insecure Iframe Sandbox in Unused Component
**Vulnerability:** Found `allow-same-origin` combined with `allow-scripts` in `components/ArtifactCard.tsx`'s iframe sandbox. This allows the embedded content to potentially bypass the sandbox and access the parent origin's data.
**Learning:** Even unused or "dead" code can harbor security vulnerabilities that might be reactivated later.
**Prevention:** Audit all `iframe` usage for `sandbox` configuration, ensuring `allow-same-origin` is not used with `allow-scripts` unless strictly necessary and understood.
