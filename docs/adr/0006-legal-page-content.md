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

**Update (2026-08-05):** explicit operator decision to treat the site as a
private, non-commercial project for Impressum/Privacy Policy purposes and
omit a postal address accordingly (name + email only). Flagged to the
operator beforehand that §5 TMG's "geschäftsmäßig" threshold is broader
than "makes money" - a site also used for professional self-promotion
(this project is described elsewhere in its own docs as a portfolio piece)
is arguably not "rein privat", and a P.O. box generally doesn't satisfy
the ladungsfähige-Anschrift requirement if an Impressum does turn out to
be required. The operator chose to proceed on the private classification
regardless. This is exactly the kind of judgment call this ADR's
draft-banner exists to catch before go-live - not resolved by this commit,
only recorded.
