## 2026-02-20 - [Iframe Sandbox Escape]
**Vulnerability:** Found `allow-same-origin` in `iframe` sandbox attribute with `srcDoc` in `components/ArtifactCard.tsx`.
**Learning:** When using `srcDoc` in an iframe, the content inherits the parent's origin unless `allow-same-origin` is omitted. Including it negates the sandbox protection against XSS/CSRF if scripts are also allowed.
**Prevention:** Always omit `allow-same-origin` when rendering untrusted content in an iframe, especially with `srcDoc`.
