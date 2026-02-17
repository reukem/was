## 2026-02-17 - Unused Vulnerability Patterns
**Vulnerability:** Found `ArtifactCard.tsx` (dead code) using `sandbox="allow-scripts allow-same-origin"`. This combination allows iframe content to bypass sandbox protections and access the parent DOM.
**Learning:** Vulnerabilities in unused code can become active risks if the code is later integrated without review.
**Prevention:** Audit all code, including unused components, for dangerous patterns like insecure iframe sandboxing.
