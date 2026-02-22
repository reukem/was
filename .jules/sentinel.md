## 2025-05-15 - Vite Config Secret Injection
**Vulnerability:** `vite.config.ts` was configured to inject `GEMINI_API_KEY` via the `define` property, which hardcodes the value into the client-side bundle during build.
**Learning:** This injection occurs even if the variable is never referenced in the source code, creating a hidden exposure risk that static analysis of `src` might miss.
**Prevention:** Avoid using `define` to polyfill `process.env` for secrets. Verify build artifacts (`dist/`) to ensure no sensitive strings are embedded.
