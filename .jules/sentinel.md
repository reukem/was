## 2026-03-29 - [HTTP Parameter Injection in API Keys]
**Vulnerability:** API key used as a URL parameter in `callGeminiAPI` was not URI encoded, allowing potential HTTP Parameter Injection if the API key contains special characters like `&` or `=`.
**Learning:** URL parameters mapped from external sources (even settings) must always be URI encoded. Additionally, missing client-side limits on input fields allow users to type arbitrarily long inputs which can lead to DoS or unnecessary memory allocations on the frontend before hitting an API.
**Prevention:** Wrap user-provided API keys in `encodeURIComponent()` and explicitly configure `maxLength` attributes on user input components to limit maximum payload length.
