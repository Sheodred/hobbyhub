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
are live. See [ROADMAP](#roadmap) below and `docs/adr/` for the technical
decisions already locked in.

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

- **Mobile-drawer viewport behavior is only verified via jsdom unit
  tests**, not a real narrow-viewport screenshot - the automation tool
  used during development couldn't actually resize the browser viewport.
  Planned: a manual pass on a real phone/resized window as part of the
  Milestone 8 polish work below.
- **Animation/responsive/accessibility polish (Milestone 8, in progress).**
  Framer Motion entrance animations (respecting `prefers-reduced-motion`
  throughout, via a shared `FadeIn` wrapper) now reach every page - MTG,
  Marketplace, and Chess included, not just the homepage. Still open: a
  general keyboard-navigation/contrast audit across the whole app, and
  real-device confirmation of the mobile drawer (see the viewport-testing
  gap above).
- **No production deployment target yet** (Milestone 9). Locally this runs
  via `docker compose` with Vite's dev server in the frontend container -
  a real deploy needs a production build (multi-stage Dockerfile serving
  the static `vite build` output, not the dev server) and a hosting
  decision, tracked as part of the deploy checklist below.

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
- [ ] Animation/responsive/accessibility polish
- [ ] Test coverage hardening, deploy checklist

## License

MIT — see [LICENSE](LICENSE)
