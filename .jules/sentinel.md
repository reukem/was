# Sentinel's Journal

## 2025-02-18 - Insecure Environment Variable Injection
**Vulnerability:** `vite.config.ts` was configured to blindly inject `process.env.GEMINI_API_KEY` into the client-side bundle via the `define` option. This would hardcode the secret into the build artifacts if the environment variable was present during the build process.
**Learning:** Developers sometimes misuse `define` to shim `process.env` for frontend code, not realizing that Vite (and other bundlers) replace these tokens with literal strings at build time, effectively publishing the secrets.
**Prevention:** Avoid using `define` for environment variables. Use `import.meta.env` and the `VITE_` prefix for public variables. Never expose secrets to the client side.
