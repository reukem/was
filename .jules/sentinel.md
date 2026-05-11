## 2025-02-27 - Missing Input Length Limits
**Vulnerability:** User inputs (`textarea` for chat, `input` for API keys) lacked length validation (`maxLength`), allowing potentially unlimited text input.
**Learning:** In client-heavy architectures like this, storing unbounded data in `localStorage` or sending massive payloads to external APIs (Gemini/ElevenLabs) creates significant client-side Denial of Service (DoS) risks and API payload explosion.
**Prevention:** Always enforce strict `maxLength` attributes on UI inputs corresponding to storage boundaries or external API payload constraints.
