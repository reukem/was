## 2024-05-18 - [Vite define secret leakage]
**Vulnerability:** Hardcoded environment variables using Vite's `define` config (`'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY)`) bakes secrets directly into the public client-side bundle.
**Learning:** `define` in Vite performs a literal string replacement during the build process, so anything assigned there, including loaded secrets from `.env`, will be fully exposed in the output JS file.
**Prevention:** Only use `define` to safely stub required `process.env` references (e.g. for third-party libraries that expect them) with empty strings (`JSON.stringify('')`). Use `import.meta.env` for actual client-safe environment variables, and never expose sensitive keys on the client-side.
