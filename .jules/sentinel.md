## 2026-04-14 - Prevent Secret Leakage in Vite Config
**Vulnerability:** The `vite.config.ts` was using the `define` block to inject `env.GEMINI_API_KEY`. Because this is a client-side Vite application, this accidentally baked the server/build-environment secret into the public JavaScript bundle, exposing the API key to all users.
**Learning:** In a BYOK (Bring Your Own Key) architecture using `localStorage`, dependencies might still expect `process.env` to exist. Injecting real keys to satisfy these dependencies compromises security.
**Prevention:** Only use Vite's `define` block to safely stub `process.env` references with empty strings (e.g., `JSON.stringify('')`) to prevent both secret leakage and runtime `ReferenceError` crashes.
