## 2026-04-16 - Prevent HTTP Parameter Injection
**Vulnerability:** Dynamically injected API keys in fetch requests lacked encoding, allowing potential HTTP parameter injection if a user inputs a malformed key containing `&` or other URI control characters.
**Learning:** Even when reading values directly from `localStorage`, any value injected into a URI must be properly encoded to ensure it is treated strictly as a parameter value.
**Prevention:** Always wrap dynamically injected parameters in fetch URLs with `encodeURIComponent()`.
