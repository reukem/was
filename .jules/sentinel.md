## 2025-02-14 - Unsafe Iframe Sandbox Configuration
**Vulnerability:** `ArtifactCard.tsx` uses `allow-scripts` and `allow-same-origin` together in the iframe sandbox attribute.
**Learning:** When `allow-scripts` and `allow-same-origin` are both present, the sandboxed content can access the parent document's DOM and potentially remove the sandbox attribute itself, escaping the sandbox. This defeats the purpose of sandboxing untrusted content.
**Prevention:** Avoid combining `allow-scripts` and `allow-same-origin`. For `srcDoc` iframes, `allow-same-origin` is often unnecessary as the content is embedded. If the content needs to be treated as unique origin, remove `allow-same-origin`.
