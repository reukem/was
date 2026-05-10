## 2024-05-24 - Missing input length limits
**Vulnerability:** Input fields (`textarea` and `input`) do not enforce length limits, which could lead to client-side DoS or excessive API payloads.
**Learning:** Found during codebase review for missing `maxLength` attribute. Memory specifies enforcing length limits.
**Prevention:** Add `maxLength` to all user inputs.
