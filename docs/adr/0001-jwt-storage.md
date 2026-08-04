# ADR-0001: JWT storage

## Status
Accepted

## Context
The spec asks for "JWT-based sessions" without specifying where the token
lives client-side. The naive default — storing the JWT in `localStorage` —
is readable by any script on the page, making it a direct target for XSS.

## Decision
Short-lived access token (~15 min) held only in React state/memory, never
persisted to `localStorage`/`sessionStorage`. Long-lived refresh token in an
`httpOnly`, `Secure`, `SameSite=Strict` cookie, rotated on every use with
reuse-detection (a reused/revoked refresh token invalidates all sessions for
that user).

## Consequences
- Frontend fetch client needs `credentials: "include"`.
- Backend CORS config needs an explicit allowed origin (not `*`) once
  cookies are in play.
- An XSS bug can't directly exfiltrate a long-lived credential — worst case
  is a 15-minute access token.
- Slightly more backend complexity (refresh rotation + reuse detection)
  than a stateless "just check the JWT" approach.

This is a deliberate upgrade over a literal reading of the spec, called out
explicitly here rather than silently substituted.
