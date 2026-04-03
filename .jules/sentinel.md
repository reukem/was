
## 2024-05-18 - Prevent Secret Leakage in Vite Bundle
**Vulnerability:** The `vite.config.ts` was baking sensitive environment variables (`GEMINI_API_KEY`) directly into the public client bundle using the `define` property. This makes the secret accessible to anyone who inspects the frontend code.
**Learning:** Vite's `define` replaces global variables with constant values at build time. When passing secrets, they end up hardcoded in the built assets. The frontend code is BYOK (Bring Your Own Key) and only needs the stub to satisfy dependency references.
**Prevention:** Never map sensitive `.env` values to `define` variables. Instead, use `define` only to safely stub required `process.env` references with empty strings to satisfy third-party library constraints.
