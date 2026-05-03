## 2024-05-03 - [CRITICAL] Prevented Vite Config Secret Leakage
**Vulnerability:** API Keys were manually injected into the frontend build via Vite's `define` config (`process.env.GEMINI_API_KEY`).
**Learning:** Developers might mistakenly use Vite's `define` feature to bypass the lack of `process.env` in Vite, exposing secrets to client-side bundles.
**Prevention:** Rely on runtime input (like BYOK - Bring Your Own Key) or strictly use `import.meta.env` for safe public variables, never injecting server-side secrets via `define`.
