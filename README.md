# HobbyHub

![CI](https://github.com/Sheodred/hobbyhub/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

A personal hobby web app: a fancy homepage, an About Me page, a Magic: The
Gathering card browser (Scryfall), a chess-vs-AI page (client-side
Stockfish), a non-transactional board-games/cards listing page, member
accounts, and the required legal pages for a Germany-based operator.

**Status:** app shell, JWT auth (signup/login/logout/password reset), the
homepage, the About Me page, the legal pages (Impressum/Privacy
Policy/Terms — draft template content, see `docs/adr/0006`), the
Magic: The Gathering card search/browse subpage (live Scryfall data via a
backend proxy, see `docs/adr/0003`), the marketplace (public
browse/filter/sort, owner-only listing CRUD, see `docs/adr/0005`), and
chess vs. AI (Stockfish running fully client-side, see `docs/adr/0004`)
are live. Entrance animation, a keyboard-nav/contrast pass, and a
production frontend build (nginx serving the static bundle, not Vite's
dev server) are done too.

Also live: the homepage's three scheduled/cached info panels (Tagesschau
headlines, Wizards of the Coast news, local weather), an MTG Meta & Stats
page (most-played cards and popular Commander decks via EDHREC, Standard/
Commander tier lists via MTGGoldfish), a related-combos panel on MTG card
detail pages (Commander Spellbook), and a Scryfall hover-preview on card/
commander names. See
[`docs/project-brief.md`](docs/project-brief.md) for the full spec this
was built against, phase by phase, annotated with what's actually done.
The separate MTG fan-game project
([Sheodred/mtg-planeswalk](https://github.com/Sheodred/mtg-planeswalk))
is at the concept/lore stage - not yet linked from a page on this site,
see Known issues below. See [ROADMAP](#roadmap) below and `docs/adr/` for
the technical decisions already locked in.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the system diagram,
the feature-area-to-code map, two annotated request flows, and the data
model - `docs/adr/` covers the reasoning behind each individual decision
in more depth.

## Why this project

A second full-stack portfolio piece alongside
[hybrid-search-api](https://github.com/Sheodred/hybrid-search-api), this
time Java/Spring Boot on the backend — directly relevant to ongoing
Fullstack Java job applications — paired with a React/TypeScript frontend
with real animation, a resizable app shell, JWT auth done properly
(httpOnly refresh cookies, not naive localStorage), and a third-party API
integration (Scryfall) done within its rate-limit/terms constraints.

## Tech stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion,
react-resizable-panels, React Router, TanStack Query.
**Backend:** Java 21, Spring Boot 3 (Web, Security, Data JPA), PostgreSQL,
Flyway, JWT (jjwt).
**Chess:** chess.js + stockfish.js (WASM, client-side, Web Worker).
**MTG data:** [Scryfall REST API](https://scryfall.com/docs/api), proxied
through the backend (see `docs/adr/0003-scryfall-proxy.md`).
**Infra:** Docker Compose (local dev), GitHub Actions CI.

## Setup

```bash
git clone https://github.com/Sheodred/hobbyhub.git
cd hobbyhub
cp .env.example .env

docker compose up --build
```

- Backend: http://localhost:8080 (health check: `/api/health`)
- Frontend: http://localhost:5173

## Tests

```bash
# backend - unit tests only
cd backend && mvn test

# backend - unit + Testcontainers integration tests (needs Docker running)
cd backend && mvn verify

# frontend
cd frontend && npm install && npm test
```

## Known issues / planned improvements

- **Mobile-drawer viewport behavior is only verified via jsdom unit tests
  and a code-level responsive review**, not a real narrow-viewport
  screenshot - the browser automation used during development reports
  success on resizing but the viewport stays desktop-sized, a confirmed
  environment limitation rather than an app bug. Still a manual TODO: a
  pass on a real phone/resized window.
- **No hosting decision made yet** (Milestone 9). The frontend now runs a
  real production build (multi-stage Dockerfile, nginx serving the static
  bundle instead of Vite's dev server), and
  [`docs/deploy-checklist.md`](docs/deploy-checklist.md) has the concrete
  pre-launch checklist (required env vars, the two real launch blockers,
  and a proposed hosting target) - actually picking and standing up that
  target is still open.
- **Test coverage could go further.** Auth, marketplace CRUD, and chess
  move validation are well covered; broader hardening across the rest of
  the backend is an ongoing, not one-and-done, item.
- **The WotC news panel and the MTGGoldfish-sourced tier lists are
  scraping-based, explicitly "may break" integrations** - both have no
  official API, so they depend on those sites' current HTML structure.
  Each falls back gracefully (an empty/manual state, not a crash or a
  visible error) if the selector stops matching - see
  `news.client.WotcNewsClient` and `mtg.meta.client.MtgGoldfishClient`.
- **The MTG fan-game link page (site section, not the game itself) isn't
  built yet.** The separate
  [mtg-planeswalk](https://github.com/Sheodred/mtg-planeswalk) repo exists
  with a concept doc and an initial lore corpus, but nothing here links to
  it yet.
- **The lore chatbot is on the roadmap, not being built yet** (explicit
  decision, 2026-08-05). The infrastructure question is answered though:
  a dedicated Elasticsearch instance in hobbyhub's own `docker-compose.yml`,
  kept fully separate from the one behind
  [hybrid-search-api](https://github.com/Sheodred/hybrid-search-api),
  rather than this project's own Postgres via pgvector as originally
  sketched — see [`docs/adr/0008`](docs/adr/0008-lore-chatbot-elasticsearch.md)
  for the concept (reference service definition, index mapping, what's
  still an open parameter) and `docs/project-brief.md` section 11 for
  status.

## Roadmap

Full phased build order, data model, API surface, and the reasoning behind
every non-obvious technical decision live in `docs/` — see
[`docs/architecture.md`](docs/architecture.md) for the system overview and
`docs/adr/` for individual decisions (JWT storage, Scryfall access pattern,
sidebar library, chess/marketplace/legal-page/password-reset scope for v1).

- [x] Milestone 0 — scaffold, Docker Compose, CI, ADRs
- [x] App shell (nav, resizable/collapsible sidebar, route transitions)
- [x] Auth (signup/login/logout/password reset, JWT)
- [x] Homepage
- [x] About Me + legal pages
- [x] Magic: The Gathering subpage
- [x] Marketplace (listing/inquiry, no live checkout)
- [x] Chess vs. AI
- [x] Animation/responsive/accessibility polish (real-device mobile check still manual - see Known issues)
- [ ] Test coverage hardening, deploy checklist, and a hosting decision (checklist and production build done - see Known issues)
- [x] Homepage info panels (Tagesschau, WotC news, weather)
- [x] MTG Meta & Stats page (EDHREC + MTGGoldfish)
- [x] MTG related-combos panel (Commander Spellbook) + Scryfall hover previews
- [ ] MTG fan-game link page (separate repo exists, not linked from this site yet)
- [ ] MTG lore chatbot (infra concept decided, `docs/adr/0008` - build itself on the roadmap, see Known issues)

## License

MIT — see [LICENSE](LICENSE)
