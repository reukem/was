## 2024-05-18 - [Vite config define leaks env variables]
**Vulnerability:** The API key for Gemini was hardcoded in `vite.config.ts` using the `define` option, which directly injects secrets into the client-side JavaScript bundle during the build.
**Learning:** Build tools like Vite use `define` to statically replace variables with their actual string values during compilation. If `process.env.API_KEY` is set to a secret, that secret becomes a hardcoded string in the final bundle, making it trivial for an attacker to extract.
**Prevention:** Avoid injecting environment variables into client code using string replacement mechanisms like `define`. If API access is needed, use a secure backend proxy or, for BYOK architectures like this, use local storage/user input to provide the key.
