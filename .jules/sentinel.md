# Sentinel's Journal

## 2026-02-21 - Insecure Iframe Sandbox
**Vulnerability:** The `ArtifactCard` component used an `iframe` with both `allow-scripts` and `allow-same-origin` in its `sandbox` attribute.
**Learning:** This combination allows the iframe content to bypass the sandbox restrictions and access the parent window's DOM and storage, defeating the purpose of sandboxing. Even if the component is unused, it poses a risk if later adopted.
**Prevention:** Avoid combining `allow-scripts` and `allow-same-origin` unless absolutely necessary and the content is trusted. For untrusted content, always exclude `allow-same-origin`.
