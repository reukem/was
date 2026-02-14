## 2026-02-14 - [Vite Env Injection]
**Vulnerability:** Insecure injection of API keys via `vite.config.ts` using `define`.
**Learning:** This pattern exposes secrets directly into the client bundle if present in the build environment, even if unused in the code.
**Prevention:** Use `import.meta.env` and proper `VITE_` prefixing, or backend proxies. Remove unused definitions immediately.
