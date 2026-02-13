# Sentinel Journal - Critical Learnings

## 2024-05-22 - Prevent Hardcoded Secret Injection in Build
**Vulnerability:** `vite.config.ts` was configured to inject `process.env.API_KEY` and `process.env.GEMINI_API_KEY` from environment variables into the client-side bundle via the `define` property.
**Learning:** Even if the keys are not currently used in the codebase, this configuration creates a mechanism for accidental secret leakage. If a developer were to use `process.env.API_KEY` for server-side logic thinking it's safe, it would be exposed to the client.
**Prevention:** Remove unnecessary `define` blocks that inject sensitive environment variables. Only expose what is explicitly needed for the client (usually prefixed with `VITE_` and accessed via `import.meta.env`).

## 2024-05-22 - JSX Syntax Error in Build
**Vulnerability:** N/A (Build Error)
**Learning:** Unescaped `>` characters in JSX text nodes can cause build failures in strict parsers (like esbuild/Vite), even if they appear valid in some contexts.
**Prevention:** Always escape `>` as `&gt;` or `{' > '}` in JSX text content to ensure cross-parser compatibility and prevent build breakages.
