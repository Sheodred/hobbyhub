# ADR-0007: Password-reset email delivery

## Status
Superseded (2026-08-05) — auth (and with it, password reset) was extracted
to the separate [kluge-boards-and-cards](https://github.com/Sheodred/kluge-boards-and-cards)
project as part of the PHP/MySQL migration (see `docs/adr/0009`). Kept for
reference; the reasoning below still applies wherever that project ends up
wiring real delivery.

~~Accepted (open for revisit)~~

## Context
The spec asks for a password-reset flow but names no email/SMTP provider —
a gap, not an oversight to fill in silently.

## Decision
v1 runs in dev-mode only: the reset token is logged server-side / returned
in the API response, gated behind a `dev` Spring profile and never active
under `prod`. Real SMTP delivery (Spring Mail + a provider such as Resend or
Mailtrap) is a deferred follow-up.

## Consequences
- Early milestones aren't blocked on picking/configuring an email provider
  or acquiring credentials.
- The reset flow is fully testable end-to-end in dev/CI without any
  external service.
- Must not ship to `prod` without wiring real delivery first — the profile
  gate exists specifically to make that mistake loud rather than silent.
