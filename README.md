# HobbyHub

![CI](https://github.com/Sheodred/hobbyhub/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

A personal hobby web app: a fancy homepage, an About Me page, a Magic: The
Gathering card browser (Scryfall), a chess-vs-AI page (client-side
Stockfish), and the required legal pages for a Germany-based operator. No
accounts, nothing to sign up for — member accounts and a marketplace
listing feature were split out to a separate project (see Architecture
below).

**Status:** app shell, the homepage, the About Me page, the legal pages
(Impressum/Privacy Policy/Terms — draft template content, see
`docs/adr/0006`), the Magic: The Gathering card search/browse subpage (live
Scryfall data via a PHP backend proxy, see `docs/adr/0003`), and chess vs.
AI (Stockfish running fully client-side, see `docs/adr/0004`) are live.
Entrance animation and a keyboard-nav/contrast pass are done too. The
backend runs on PHP/MySQL instead of the original Spring Boot/PostgreSQL
stack — see `docs/adr/0009` for why and what changed.

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
in more depth, and [`docs/project-history.md`](docs/project-history.md)
tells the story of how the project got here, including the real pitfalls
hit along the way.

## Why this project

A second full-stack portfolio piece alongside
[hybrid-search-api](https://github.com/Sheodred/hybrid-search-api), paired
with a React/TypeScript frontend with real animation, a resizable app
shell, and third-party API integrations (Scryfall, Commander Spellbook,
EDHREC, MTGGoldfish, Tagesschau) done within their rate-limit/terms
constraints. The backend originally ran Java/Spring Boot (relevant to
Fullstack Java job applications at the time); it was later migrated to
PHP/MySQL to run on IONOS shared hosting — see `docs/adr/0009`.

## Tech stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion,
react-resizable-panels, React Router, TanStack Query.
**Backend:** PHP 8.3, MySQL/MariaDB 10 (cache-aside + WebCron-refreshed
tables, no ORM/framework — see `docs/adr/0009`).
**Chess:** chess.js + stockfish.js (WASM, client-side, Web Worker).
**MTG data:** [Scryfall REST API](https://scryfall.com/docs/api) and
[Commander Spellbook](https://commanderspellbook.com/), proxied through the
backend (see `docs/adr/0003-scryfall-proxy.md`); EDHREC and MTGGoldfish for
the Meta & Stats page.
**Infra:** Docker Compose (local dev: MariaDB + `php:8.3-apache` +
Vite dev server), GitHub Actions CI, IONOS Webhosting Plus + WebCron
(production).

## Setup

```bash
git clone https://github.com/Sheodred/hobbyhub.git
cd hobbyhub
cp .env.example .env
cp api/config.example.php api/config.local.php   # only needed for real prod values; local docker-compose works without it

docker compose up --build
```

- API: http://localhost:8081 (health check: `/api/health`)
- Frontend: http://localhost:5173 (proxies `/api` to the API service)

The two WebCron-equivalent scripts don't run on a schedule locally — seed
the news/meta tables once after startup:

```bash
docker compose exec php php /var/www/html/api/cron/refresh_news.php
docker compose exec php php /var/www/html/api/cron/refresh_mtg_meta.php
```

## Tests

```bash
# api - PHPUnit against a real MySQL/MariaDB instance (env vars below match
# the docker-compose mariadb service; adjust for a different DB target)
cd api && composer install
DB_HOST=mariadb DB_NAME=hobbyhub DB_USER=hobbyhub DB_PASSWORD=hobbyhub vendor/bin/phpunit

# frontend
cd frontend && npm install && npm test
```

PHPUnit covers `ScryfallClient`'s cache-aside behavior (cache hit/miss/
expiry, "no cards match" as an empty result rather than an error) and both
cron scripts' replace-on-success / rollback-and-keep-existing-cache-on-
failure behavior (`replace_news`, `replace_meta` in `api/lib/`) - the two
areas named as the highest-risk untested surface after the PHP migration.
Outbound third-party HTTP calls are faked via an injected callable per
test; the database itself is real, not mocked, matching how the app
actually behaves. Everything else in `api/` still has no test coverage.

## Known issues / planned improvements

- **Mobile-drawer viewport behavior is only verified via jsdom unit tests
  and a code-level responsive review**, not a real narrow-viewport
  screenshot - the browser automation used during development reports
  success on resizing but the viewport stays desktop-sized, a confirmed
  environment limitation rather than an app bug. Still a manual TODO: a
  pass on a real phone/resized window.
- **Production deploy workflow untested against the real host.**
  `.github/workflows/deploy.yml` builds and SFTP-uploads to IONOS on every
  push to `main`, but it hasn't run against real IONOS credentials yet -
  needs `IONOS_SFTP_HOST`/`_USER`/`_PASSWORD` added as GitHub repo secrets
  first (not something set from a CI run), plus `api/config.local.php` and
  `api/sql/schema.sql` applied manually on the server once. See
  [`docs/deploy-checklist.md`](docs/deploy-checklist.md) for the full
  pre-launch checklist.
- **PHP test coverage is partial.** The migration to PHP/MySQL
  (`docs/adr/0009`) dropped the 60+ backend JUnit tests with no equivalent
  added at the time - later backfilled for the two highest-risk areas
  (`ScryfallClient`'s cache-aside logic, both cron scripts' replace/
  rollback behavior, see Tests above), but everything else in `api/`
  (the other *Client classes, every endpoint's request/response handling)
  still has no coverage beyond the `php -l` syntax check.
- **The WotC news panel and the MTGGoldfish-sourced tier lists are
  scraping-based, explicitly "may break" integrations** - both have no
  official API, so they depend on those sites' current HTML structure.
  Each falls back gracefully (an empty/manual state, not a crash or a
  visible error) if the selector stops matching - see
  `api/lib/WotcNewsClient.php` and `api/lib/MtgGoldfishClient.php`.
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
`docs/adr/` for individual decisions (Scryfall access pattern, sidebar
library, chess/legal-page scope, the PHP/MySQL/IONOS migration - some
older ADRs on JWT/marketplace are marked Superseded now that those
features live in a separate project).

- [x] Milestone 0 — scaffold, Docker Compose, CI, ADRs
- [x] App shell (nav, resizable/collapsible sidebar, route transitions)
- [x] Homepage
- [x] About Me + legal pages
- [x] Magic: The Gathering subpage
- [x] Chess vs. AI
- [x] Animation/responsive/accessibility polish (real-device mobile check still manual - see Known issues)
- [x] Homepage info panels (Tagesschau, WotC news, weather)
- [x] MTG Meta & Stats page (EDHREC + MTGGoldfish)
- [x] MTG related-combos panel (Commander Spellbook) + Scryfall hover previews
- [x] Migrate backend from Spring Boot/PostgreSQL to PHP/MySQL for IONOS hosting; extract auth/marketplace to a separate project (`docs/adr/0009`)
- [~] Production deploy workflow (GitHub Actions → IONOS SFTP, `.github/workflows/deploy.yml`) - written and pinned, not yet run against real IONOS credentials, see Known issues
- [ ] MTG fan-game link page (separate repo exists, not linked from this site yet)
- [ ] MTG lore chatbot (infra concept decided, `docs/adr/0008` - build itself on the roadmap, see Known issues)
- [ ] Marketplace - moved to [kluge-boards-and-cards](https://github.com/Sheodred/kluge-boards-and-cards)'s roadmap, not this repo's

## License

MIT — see [LICENSE](LICENSE)
