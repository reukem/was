## 2026-01-25 - Unused Secret Exposure in Build Config
**Vulnerability:** `vite.config.ts` was configured to inject `GEMINI_API_KEY` into `process.env` via `define`, even though the client code didn't use it.
**Learning:** Build tools often allow injecting environment variables. Leaving these configurations for unused secrets increases the attack surface (latent vulnerability) if the secrets are present in the build environment.
**Prevention:** Only expose environment variables explicitly needed by the client. Remove dead configuration code.
