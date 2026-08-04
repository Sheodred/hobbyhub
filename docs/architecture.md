# Architecture

```
Client (React 18 + Vite)
  |
  +--> Spring Boot API (/api/**)
  |      |
  |      +--> PostgreSQL - users, refresh/reset tokens, marketplace listings
  |      |
  |      +--> Scryfall API - MTG card search/printings (throttled + cached,
  |                           see docs/adr/0003)
  |
  +--> Stockfish (WASM, in a Web Worker) - chess opponent runs entirely in
        the browser, no backend involvement (docs/adr/0004)
```

## Feature areas

| Area | Backend package | Frontend feature folder | Persistence | Notes |
|---|---|---|---|---|
| Auth | `auth/` | `features/auth/` | Postgres (`users`, `refresh_tokens`, `password_reset_tokens`) | JWT access token in memory + httpOnly refresh cookie, rotation + reuse detection - docs/adr/0001 |
| Profile | `user/` | `features/auth/ProfilePage.tsx` | Postgres (`users`) | Thin CRUD on the authenticated user |
| MTG | `mtg/` | `features/mtg/` | none (proxied live) | Backend proxies Scryfall - throttling, a 5-min cache, graceful empty-result handling - docs/adr/0003 |
| Marketplace | `marketplace/` | `features/marketplace/` | Postgres (`listings`, `listing_images`) | Owner-or-admin authorization in the service layer, JPA Specifications for filter/sort, soft delete via status - docs/adr/0005 |
| Chess | none | `features/chess/` | `localStorage` only | chess.js for rules, Stockfish (WASM) for the opponent, both entirely client-side - docs/adr/0004 |
| About / Legal | none | `features/about/`, `features/legal/` | none | Static content; legal pages are a structural template, not legal advice - docs/adr/0006 |

`common/` and `config/` hold cross-cutting backend concerns (global exception
handling, security filter chain, CORS, caching) rather than a feature of
their own.

## Request flow: authenticated write (example - creating a marketplace listing)

1. The browser holds a short-lived JWT access token in memory (never
   `localStorage`) and a long-lived refresh token in an httpOnly, Secure,
   `SameSite=Strict` cookie (docs/adr/0001).
2. `POST /api/listings` carries the access token as a `Bearer` header.
   `JwtAuthFilter` validates it and populates an `AuthenticatedUser`
   principal (id, email, role) directly from the token's claims - no DB
   round-trip needed to identify the caller.
3. `ListingService` loads the `User` row for the seller, builds the
   `Listing` entity, and persists it. Authorization for *edits* is
   IDOR-safe: `ListingService` checks `listing.isOwnedBy(principal.id())`
   or `principal.role() == ADMIN` before allowing an update/delete,
   independent of anything the client sends.
4. If the access token has expired, the frontend's `apiFetch` wrapper
   catches the resulting 401, calls `POST /api/auth/refresh` (which reads
   the httpOnly cookie the browser attached automatically), and retries the
   original request exactly once with the new access token.

## Request flow: MTG search (public, no auth)

1. `GET /api/mtg/search?q=...` hits `MtgController`, which is `permitAll`
   in `SecurityConfig` (Scryfall's terms forbid paywalling card data, and
   there's no user data at stake in a search).
2. `ScryfallClient` enforces a minimum ~100ms spacing between outbound
   Scryfall calls (their API guidelines) and checks a 5-minute Caffeine
   cache before making a real request.
3. Scryfall's "no cards match" response (a 404) is translated into a
   normal empty result, not an error - a real card search returning zero
   hits shouldn't look like a failure.
4. The response is mapped from Scryfall's schema into this app's own
   `Card`/`CardSearchResponse` DTOs before returning - the frontend never
   depends on Scryfall's wire format directly.

## Data model

- `users`, `refresh_tokens`, `password_reset_tokens` (auth)
- `listings`, `listing_images` (marketplace) - `listing_images` is a plain
  `@ElementCollection` child table (URL-only in v1, see docs/adr/0005), not
  a separate entity; note it's fetched `EAGER` rather than the JPA default
  of `LAZY`, since `open-in-view` is disabled and every read path needs the
  images immediately for serialization
- No tables for chess (client-only) or MTG (proxied live, never stored)

See `V1__auth.sql` / `V2__marketplace.sql` in
`backend/src/main/resources/db/migration/` for the exact schema.

## Deployment

`docker-compose.yml` runs three services locally: `postgres`, `backend`
(Spring Boot, port 8080), `frontend` (Vite dev server, port 5173). CI
(`.github/workflows/ci.yml`) runs two independent jobs per PR/push to
`main`: backend (`mvn verify` - unit tests plus Testcontainers integration
tests against a real Postgres) and frontend (lint, `vitest`, `vite build`).
No cloud/production deployment target is configured yet - see the
"Test coverage hardening, deploy checklist" item in the README roadmap.

## Why these decisions

Each non-obvious choice - JWT storage, the Scryfall proxy pattern, the
sidebar library, chess/marketplace-image/legal-content/password-reset
scope for v1 - has its own ADR under `docs/adr/`, including the
alternatives considered and the trade-offs accepted. This document is the
map; the ADRs are the reasoning.
