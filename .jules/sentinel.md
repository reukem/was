## 2024-10-24 - [Vite Secret Injection]
**Vulnerability:** `vite.config.ts` uses `define` to replace `process.env.GEMINI_API_KEY` with the actual environment variable value during build.
**Learning:** This hardcodes the secret into the client-side bundle if the env var is present during build, exposing it to anyone with access to the build artifacts.
**Prevention:** Avoid `define` for secrets. Use `import.meta.env` (though still exposed in client) or preferably a backend proxy.
