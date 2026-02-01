# Sentinel Journal

## 2026-02-01 - Insecure Client-Side Secret Injection
**Vulnerability:** Hardcoded injection of `GEMINI_API_KEY` into the client bundle via `vite.config.ts`'s `define` property. This exposes the API key to anyone with access to the client-side code.
**Learning:** The project used `define: { 'process.env.GEMINI_API_KEY': ... }` to shim `process.env` for the browser. While convenient, this pattern bakes the secret value into the build artifacts at compile time.
**Prevention:** Avoid using `define` for secrets. Use `import.meta.env` for public variables (prefixed with `VITE_`) and keep sensitive keys on the server side. If a client-side app *must* use a key (e.g. rapid prototyping), explicit user consent/action should be required, rather than silent injection via build config.
