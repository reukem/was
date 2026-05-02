## 2026-05-02 - Removed build-time API Key injection
**Vulnerability:** The Gemini API key (`GEMINI_API_KEY`) from `.env` was being hardcoded into the client-side JavaScript bundle via the `define` option in `vite.config.ts`.
**Learning:** Exposing environment variables directly via build tool replacements (like Vite's `define` or Webpack's `DefinePlugin`) embeds the secrets statically in the resulting output, which can be extracted by users.
**Prevention:** Avoid defining sensitive keys globally at build time. For client-provided keys, load them via runtime mechanisms like `localStorage` (as this app correctly does elsewhere) or fetch them securely from a backend.
