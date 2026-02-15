## 2024-05-22 - Latent Secret Exposure via Build Config

**Vulnerability:** The `vite.config.ts` file contained a `define` block that injected `process.env.API_KEY` and `process.env.GEMINI_API_KEY` using the value of `GEMINI_API_KEY` from the environment. This would hardcode the secret into the client-side bundle if referenced, exposing it to anyone viewing the source.

**Learning:** Developers sometimes use `define` to shim `process.env` in browser environments, but this can inadvertently leak secrets if those variables are not meant to be public. In Vite, `define` performs a literal replacement during build.

**Prevention:** Avoid manually defining `process.env` variables in `vite.config.ts` unless they are explicitly public. Use `import.meta.env` and the `VITE_` prefix for client-side public variables. For secrets, keep them on the server or use a proxy.

## 2024-05-22 - Iframe Sandbox Hardening

**Vulnerability:** The `ArtifactCard` component used an iframe with `sandbox="allow-same-origin"` to render user-generated (LLM) content. This allowed the content to access the parent document's DOM and storage, posing a potential XSS risk if the LLM output contained malicious scripts.

**Learning:** When using `srcDoc` with iframes, `allow-same-origin` grants the iframe full access to the parent's origin. This is often unnecessary for self-contained content and defeats the purpose of sandboxing untrusted content.

**Prevention:** Always use the principle of least privilege for `sandbox` attributes. Avoid `allow-same-origin` unless absolutely necessary for functionality (e.g., accessing parent resources).
