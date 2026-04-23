## 2024-05-24 - [CRITICAL] Fix API Key Leakage in Vite Config
**Vulnerability:** Vite's `define` configuration was set to replace `process.env.API_KEY` and `process.env.GEMINI_API_KEY` with the literal string of `env.GEMINI_API_KEY`.
**Learning:** In client-side build tools like Vite, defining global constants with environment variables bakes those values into the public JavaScript bundle, exposing them to anyone who downloads the code.
**Prevention:** Avoid using `define` for sensitive keys. Use runtime injection (e.g., fetching from a secure backend or prompting user input for BYOK using `localStorage`) instead.
