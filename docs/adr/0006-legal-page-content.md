# ADR-0006: Legal-page content

## Status
Accepted

## Context
The spec requires an Impressum, Privacy Policy, and Terms of Service, and
is explicit that this isn't legal advice and templates need real review
before going live.

## Decision
Hard-coded English page components with clearly bracketed placeholders
(`[Your Full Legal Name]`, `[Street, City, Postal Code]`,
`[Hosting Provider Name & Address]`, `[DPO email or "not applicable — sole
operator"]`), structurally complete against TMG §5 / GDPR Art. 13 / a
no-live-checkout Terms of Service, gated behind a dev-only reminder banner
(`import.meta.env.DEV`) that content needs real legal review.

## Consequences
- Nothing here is legal advice; the structure is a starting point, not a
  compliance guarantee.
- Placeholders are deliberately loud/obvious so real content can't be
  accidentally shipped without someone noticing.
- No CMS or admin-editable legal content in v1 — plain components, edited
  in code when real content is ready.
