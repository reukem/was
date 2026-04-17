## 2026-04-17 - [CRITICAL] Secret Leakage via Vite Define
**Vulnerability:** The `vite.config.ts` used `define` to inject `env.GEMINI_API_KEY` into `process.env.GEMINI_API_KEY`, which bakes the API key directly into the client-side JS bundle if set in the build environment.
**Learning:** Dependencies (like `@google/genai`) may reference `process.env` and crash if it's missing, but injecting actual environment variables exposes them publicly in a frontend application.
**Prevention:** Use Vite's `define` strictly to stub `process.env` values with empty strings (e.g., `JSON.stringify('')`) to prevent runtime crashes without leaking sensitive keys. The app should rely on a BYOK (Bring Your Own Key) architecture via `localStorage`.
