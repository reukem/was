## 2024-05-24 - [Add maxLength to Text Inputs]
**Vulnerability:** Lack of length limits on user inputs (`textarea` for chat, `input` for API keys) could lead to Denial of Service (DoS) attacks via oversized payloads.
**Learning:** Client-side input validation is a crucial layer of defense against malicious inputs and unexpected performance issues.
**Prevention:** Always add `maxLength` attributes to all user inputs to enforce strict length limits.
