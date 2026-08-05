# Completed milestones (Java/Spring Boot + Postgres era)

A durable record of what was built before the PHP/MySQL migration for
IONOS Webhosting Plus (see `docs/adr/0009-php-mysql-migration.md` once
that lands). The full source for everything below is permanently
available at the `pre-php-migration` git tag, even after `backend/` is
deleted from `main`. Full phase-by-phase detail lives in
`docs/project-brief.md`; individual technical decisions are in
`docs/adr/`. This file is a compact summary, not a replacement for those.

## M0-M9 (core roadmap)

- **M0** - monorepo scaffold, Docker Compose, CI, ADRs.
- **M1** - app shell: header/nav, resizable+collapsible sidebar, mobile
  drawer, route transitions.
- **M2** - auth: JWT access token + httpOnly-cookie refresh token with
  rotation/reuse detection, signup/login/logout/password-reset,
  `ProtectedRoute`, profile page.
- **M3** - homepage: animated hero, highlight cards.
- **M4** - About Me + legal pages (Impressum/Privacy Policy/Terms, draft
  content per `docs/adr/0006`).
- **M5** - MTG card browser: Scryfall proxy (throttled + cached, see
  `docs/adr/0003`), search/browse/detail UI.
- **M6** - Marketplace: Listing CRUD, category/price filtering, owner-only
  authorization (IDOR-protected), soft delete.
- **M7** - Chess vs. AI: chess.js + Stockfish (WASM, Web Worker,
  client-side only, see `docs/adr/0004`).
- **M8** - animation pass (shared `FadeIn`), keyboard-nav/contrast audit
  (MobileDrawer modal behavior, focus rings, WCAG AA fixes).
- **M9** - production frontend build (nginx, not Vite's dev server),
  deploy checklist, `UserController` test coverage.

## Post-M9 feature work (same continuous effort, PRs #18-#29)

- **Homepage info panels**: Tagesschau + WotC news (scheduled, Postgres-
  cached) + weather (client-side, direct Open-Meteo call).
- **MTG Meta & Stats page** (`/mtg/meta`): most-played cards + popular
  Commander decks via EDHREC's JSON API; Standard/Commander tier lists
  via MTGGoldfish (scraping, robots.txt-checked); Moxfield as a manual
  link-out (no public deck API exists).
- **MTG combos panel**: up to 3 combos per card via the Commander
  Spellbook API, right-hand panel on the card detail page.
- **Scryfall hover preview** on card/commander names.
- **UI polish**: animation timing/easing per `emilkowalski/skills`'
  `emil-design-eng` guidance, tactile button press feedback.
- **GDPR/Privacy Policy pass**: found and disclosed that the weather
  panel sends geolocation directly to Open-Meteo, bypassing the backend.
- **MTG fan-game repo** (`Sheodred/mtg-planeswalk`): concept + initial
  lore corpus, separate project, content-only.
- **Lore chatbot**: infra concept decided (dedicated Elasticsearch,
  `docs/adr/0008`), build itself deliberately not started - roadmap item.

## Consistent lessons across the whole build

- **Live verification (`docker compose up --build` + real browser checks)
  caught bugs unit tests alone never would have** - double URL-encoding,
  lazy-collection serialization, a missing `repository.save()`, a chess
  UI race condition, a silently-unfollowed HTTP redirect, and a scheduler
  -killing missing timeout. Neither live verification nor tests alone was
  sufficient on their own, on this project, consistently.
- Every feature went through its own branch -> PR -> CI-green -> merge ->
  live-verify cycle, even within a single long working session - never
  batched into one giant uncheckable change.
