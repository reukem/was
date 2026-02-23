## 2025-02-18 - Hardcoded API Key Injection in Vite Config
**Vulnerability:** The `vite.config.ts` was configured to inject `GEMINI_API_KEY` from the environment into the client-side bundle via the `define` plugin, exposing it as `process.env.GEMINI_API_KEY`.
**Learning:** Even if the code doesn't use the injected variable, the `define` configuration causes the sensitive value to be embedded in the build output if the environment variable is present during the build process. This is a common pitfall when trying to pass secrets to the client.
**Prevention:** Avoid using `define` for sensitive keys. Use backend proxies for API calls requiring secrets. If client-side exposure is unavoidable (e.g., public keys), use `import.meta.env.VITE_PREFIX` explicitly and understand the risks.
