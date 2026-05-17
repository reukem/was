## 2024-05-17 - Fix Hardcoded API Key Exposure in Vite Config
**Vulnerability:** Server-side `GEMINI_API_KEY` was injected statically into the client-side bundle via the `define` block in `vite.config.ts`.
**Learning:** The application uses a BYOK (Bring Your Own Key) pattern, obtaining the key from `localStorage`. Using Vite's `define` to inject a `.env` variable overrides this and exposes the server's API key to all users in the final JavaScript payload.
**Prevention:** Never use Vite's `define` directive to inject server-side secrets into client-side bundles. Follow the established BYOK pattern and keep server-side environment variables out of the client configuration.
