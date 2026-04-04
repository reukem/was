## 2025-03-05 - Fix API Key Leakage in Vite Config
**Vulnerability:** The Gemini API key was being hardcoded into the public frontend bundle via Vite's `define` configuration.
**Learning:** Vite's `define` configuration performs string replacement at build time. Attempting to use `process.env` via `loadEnv` in the config and injecting it into the define block bakes the secret into the generated JavaScript file, exposing the API key publicly.
**Prevention:** Never use `define` to inject sensitive keys into the bundle. Instead, use it only to safely stub required `process.env` references for third-party libraries with empty strings (e.g., `JSON.stringify('')`) to prevent runtime reference errors while keeping the application secure.
