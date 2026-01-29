## 2026-01-29 - Vite Define Secret Exposure
**Vulnerability:** `vite.config.ts` used `define` to inject `process.env.GEMINI_API_KEY` into the client-side bundle. This exposes the API key in plain text in the build artifacts if the environment variable is present during build.
**Learning:** Using `define` for `process.env` variables in Vite indiscriminately exposes backend secrets to the frontend.
**Prevention:** Do not use `define` to polyfill `process.env` for secrets. Use `import.meta.env` and ensure only `VITE_` prefixed variables are exposed, or verify that the variables being defined are safe for public exposure.
