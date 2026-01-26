## 2024-05-23 - Vite Secret Injection
**Vulnerability:** `vite.config.ts` blindly injected `GEMINI_API_KEY` into `process.env` using the `define` option.
**Learning:** This exposes secrets globally in the bundle if the variable name matches, even if not intended for public exposure. It also encourages legacy `process.env` usage in client-side code.
**Prevention:** Avoid `define` for secrets. Use `import.meta.env` and proper `.env` file handling with `VITE_` prefix for explicitly public variables.
