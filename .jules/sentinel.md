## 2026-03-23 - [Vite Config Secret Exposure]
**Vulnerability:** The `vite.config.ts` was using `loadEnv` and injecting the `GEMINI_API_KEY` directly into the client-side bundle via the `define` block (`process.env.GEMINI_API_KEY`).
**Learning:** This bypassing of the expected BYOK (Bring Your Own Key) architecture using `localStorage` exposes sensitive server-side secrets or developer keys directly into the compiled public assets. Vite's `define` replaces strings at build time.
**Prevention:** Never use `define: { 'process.env': ... }` in Vite configurations for any client-facing applications unless the variables are explicitly meant to be public (e.g., `VITE_APP_VERSION`). For BYOK patterns, rely strictly on runtime mechanisms like `localStorage`.
