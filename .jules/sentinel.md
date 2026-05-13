## 2026-05-13 - [Add Input Length Limits]
**Vulnerability:** User inputs (textarea for chat, inputs for API keys) lacked length limits, which could allow excessively large payloads to be pasted or typed.
**Learning:** This is a Denial of Service (DoS) risk and can cause client-side performance issues (like React re-render freezes) or unnecessary API costs when these inputs are submitted to backend services.
**Prevention:** Always enforce `maxLength` attributes on user-facing text inputs (`input`, `textarea`) to mitigate client-side DoS risks and excessive API payloads.
