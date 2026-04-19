## 2024-05-19 - Enforce Client-Side Input Length Limits & Block Concurrent Submissions
**Vulnerability:** Unbounded input fields (`textarea`, `input`) and lack of submission rate limiting (ignoring `isAiLoading`) allowed for potential client-side Denial of Service (DoS) and API abuse.
**Learning:** React inputs without `maxLength` can crash the browser if overly large payloads are pasted. Furthermore, asynchronous form actions lacking state locks allow users to spam API requests before the previous one completes.
**Prevention:** Always enforce a `maxLength` property on text inputs (e.g., `maxLength={50000}` for chat, `200` for keys) and implement an early return in submit handlers when a loading state (like `isAiLoading`) is active.
