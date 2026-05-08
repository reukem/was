## 2025-05-08 - Added Max Length Security Boundaries
**Vulnerability:** Input fields (`<input>`, `<textarea>`) did not enforce client-side text boundaries, presenting a risk of client-side Denial of Service via excessively long inputs (e.g., pasting multi-megabyte strings) and potential payload/billing abuse against upstream LLM endpoints.
**Learning:** React state update loops and DOM render cycles can severely bottleneck or crash entirely when processing unconstrained input strings in real-time onChange handlers.
**Prevention:** Apply strict `maxLength` attributes to all user-facing `<input>` and `<textarea>` components during initial development to ensure bounded processing.
