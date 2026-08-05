# ADR-0003: Scryfall access via backend proxy

## Status
Accepted. Implementation note (2026-08-05): the proxy moved from Spring
Boot to PHP as part of the migration to IONOS shared hosting
(`docs/adr/0009`) — the decision and reasoning below are unchanged, only
`ScryfallClient` changed language (Java → PHP) and cache backend (Caffeine
in-memory → a `scryfall_cache` MySQL table with the same 5-minute TTL).

## Context
Scryfall's API terms cap sustained traffic at ~10 req/sec (they ask for a
100ms default delay between calls, 2/sec on `/cards/collection`), require an
accurate `User-Agent`, and explicitly forbid paywalling access to card data.
The MTG subpage could call Scryfall directly from the browser, or the
backend could proxy it.

## Decision
Backend proxy (`GET /api/mtg/search`, `GET /api/mtg/cards/{id}`), both
public — no auth requirement, so the "no paywalling" rule is trivially
satisfied.

## Consequences
- Rate-limit compliance (throttling, headers) lives in one place
  (`ScryfallClient`) instead of being re-implemented per browser tab —
  matters more once this is a publicly demoed portfolio site with
  potentially many simultaneous tabs hitting the same search.
- A short-TTL cache (Caffeine, in-memory) on both endpoints cuts real
  Scryfall traffic for repeated queries and insulates the detail view from
  transient Scryfall outages.
- More backend work than a trivial `fetch` from React (HTTP client, DTO
  mapping, cache) — accepted trade-off given the above.
- If this ever needs to be cut for scope, direct-frontend-fetch is a valid
  fallback, but the frontend would then need to own its own throttle
  (minimum 100ms between calls, cancel in-flight requests on new keystrokes).
