## 2025-05-15 - Unused Secret Injection in Vite Config
**Vulnerability:** `vite.config.ts` was configured to inject `process.env.GEMINI_API_KEY` into the client bundle via `define`, despite the key being unused in the application code.
**Learning:** Injecting environment variables into the client bundle makes them visible to anyone with access to the built files (if the variable exists during build). Even if unused, this mechanism increases the attack surface.
**Prevention:** Verify that injected environment variables are actually required by the client-side code. Remove unused injections.
