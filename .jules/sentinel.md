## 2024-05-23 - [Insecure Client-Side Env Injection]
**Vulnerability:** `vite.config.ts` was configured to inject `GEMINI_API_KEY` into the client-side bundle via `define`.
**Learning:** This pattern exposes secrets directly in the frontend build artifacts, making them accessible to anyone viewing the source.
**Prevention:** Avoid using `define` for sensitive environment variables in `vite.config.ts`. Use a backend proxy for API calls requiring secrets.
