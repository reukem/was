## 2025-02-27 - [Prevent HTTP Parameter Injection in API Keys]
**Vulnerability:** API keys injected directly into URL query parameters without encoding.
**Learning:** Even if API keys are expected to be alphanumeric, failure to encode them can lead to HTTP parameter injection if the source is manipulated (e.g., via localStorage).
**Prevention:** Always use `encodeURIComponent` when dynamically inserting variables into fetch request URLs.
