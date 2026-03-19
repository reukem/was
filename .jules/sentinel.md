## 2024-05-20 - API Key Exposure via Vite Define
**Vulnerability:** The `vite.config.ts` file uses `define` to inject `env.GEMINI_API_KEY` into the client bundle.
**Learning:** In a BYOK (Bring Your Own Key) architecture relying on `localStorage`, injecting environment variables via Vite's `define` is not only functionally unnecessary but critically dangerous. It bakes the build server's secrets into the public client-side bundle if any code references those `process.env` properties.
**Prevention:** Never use the `define` block in `vite.config.ts` to inject sensitive environment variables into client-side code.
