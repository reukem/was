## 2025-02-19 - Hardcoded API Key Exposure in Build Config
**Vulnerability:** The `vite.config.ts` file contained a `define` block that explicitly injected `process.env.GEMINI_API_KEY` into the client-side bundle. This exposed the API key to anyone with access to the built application.
**Learning:** Build tools like Vite can inadvertently expose secrets if `define` or similar replacement features are used to bridge environment variables to the client without filtering. Even if the code doesn't currently use the variable, the configuration itself creates a "ticking time bomb" or can be exploited if the build process is inspected.
**Prevention:**
1. Never use `define` to expose secrets. Use a backend proxy for sensitive API calls.
2. Ensure `.gitignore` includes `.env` and `.env.*` to prevent accidental commit of local secrets.
3. Audit build configurations for any `process.env` injections.
