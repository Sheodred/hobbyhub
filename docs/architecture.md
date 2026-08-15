# Architecture

```
Client (React 18 + Vite)
  |
  +--> PHP 8.3 API (/api/**, Apache + mod_rewrite, see docs/adr/0009)
  |      |
  |      +--> MySQL/MariaDB - cache tables (scryfall_cache,
  |      |     commander_spellbook_cache) and WebCron-refreshed content
  |      |     tables (news_items, mtg_meta_entries, wotc_news_fallback)
  |      |
  |      +--> Scryfall API - MTG card search/printings (throttled + cached,
  |      |     see docs/adr/0003)
  |      +--> EDHREC combo API - related combos (cached, see docs/adr/0016)
  |      +--> EDHREC / MTGGoldfish - MTG Meta & Stats (WebCron-refreshed
  |      |     every 4h, see api/cron/refresh_mtg_meta.php)
  |      +--> Tagesschau / magic.wizards.com - homepage news (WebCron-
  |            refreshed every 20min, see api/cron/refresh_news.php)
  |
  +--> Stockfish (WASM, in a Web Worker) - chess opponent runs entirely in
        the browser, no backend involvement (docs/adr/0004)
```

HobbyHub has no accounts and no server-side user data. Auth and Marketplace
were extracted to the separate
[kluge-boards-and-cards](https://github.com/Sheodred/kluge-boards-and-cards)
project (see `docs/adr/0009`) — this app is entirely public/read-only
against third-party data plus two client-side-only features (chess,
weather).

## Feature areas

| Area | API files | Frontend feature folder | Persistence | Notes |
|---|---|---|---|---|
| MTG | `api/mtg/` | `features/mtg/` | `scryfall_cache`, `commander_spellbook_cache` (5min/1h TTL cache-aside) | Live proxy to Scryfall + EDHREC combos - throttling, cache, graceful empty-result handling - docs/adr/0003, docs/adr/0009, docs/adr/0016 |
| MTG Meta & Stats | `api/mtg/meta.php`, `api/cron/refresh_mtg_meta.php` | `features/mtg/MtgMetaPage.tsx` | `mtg_meta_entries` | WebCron-refreshed every 4h from EDHREC + MTGGoldfish, replace-on-success (keeps stale cache on a failed fetch) |
| Homepage news | `api/news/`, `api/cron/refresh_news.php` | `features/home/panels/` | `news_items`, `wotc_news_fallback` | WebCron-refreshed every 20min; Tagesschau keeps cache on failure, WotC falls back to an admin-editable manual list when the scraper finds nothing |
| Chess | none | `features/chess/` | `localStorage` only | chess.js for rules, Stockfish (WASM) for the opponent, both entirely client-side - docs/adr/0004 |
| About / Legal | none | `features/about/`, `features/legal/` | none | Static content; legal pages are a structural template, not legal advice - docs/adr/0006 |

`api/lib/` holds the shared HTTP client helpers (`http_client.php`), the DB
singleton (`db.php`), the JSON response helpers (`http.php`), one
`*Client.php` per third-party integration, the two cron scripts'
extracted, unit-tested transaction helpers (`NewsRefresh.php`,
`MetaRefresh.php`), and the shared, unit-tested modules those and the
`*Client.php` files are built on: `Cache.php` (cache-aside read-through),
`ReplaceRows.php` (delete-then-bulk-insert-in-a-transaction), and
`ScrapeHtml.php` (fetch+parse+extract with a fallback default) - the PHP
equivalent of the old `common/`/`config/` cross-cutting packages.

## Request flow: MTG search (public, no auth)

1. `GET /api/mtg/search?q=...` is rewritten by `api/.htaccess` to
   `api/mtg/search.php` (every rule uses the `END` flag, not `L` - see
   docs/adr/0009's Consequences for the bug that motivated this).
2. `ScryfallClient::search()` checks `scryfall_cache` for a fresh (< 5min)
   entry keyed on the query+page before making a real request.
3. On a cache miss, `ScryfallClient::throttle()` enforces a minimum ~100ms
   spacing between outbound Scryfall calls (their API guidelines) via a
   single-row `scryfall_throttle` table, then `http_get_json()` makes the
   call with `CURLOPT_FOLLOWLOCATION` (a real 308-redirect bug, hit once on
   the Tagesschau client, made this a standing default for every outbound
   call, not just Tagesschau's).
4. Scryfall's "no cards match" response (empty `data`) is translated into a
   normal empty result, not an error.
5. The response is mapped from Scryfall's schema into this app's own shape
   (`ScryfallClient::mapCard()`) before returning and caching - the
   frontend never depends on Scryfall's wire format directly.

## Request flow: homepage news (WebCron-refreshed, not live)

1. IONOS WebCron hits `api/cron/refresh_news.php` every 20 minutes (locally,
   this is triggered manually inside the docker-compose `php` container for
   verification - see Phase 3 of `docs/adr/0009`).
2. `TagesschauClient::fetchLatest()` throws on any HTTP failure, so
   `refresh_news.php`'s transaction is skipped and the existing
   `news_items` rows for `source = 'tagesschau'` are left untouched.
3. `WotcNewsClient::fetchLatest()` catches its own failures internally and
   returns `[]`; when that happens, `refresh_news.php` substitutes the
   admin-editable `wotc_news_fallback` table's content instead of leaving
   the panel empty.
4. `GET /api/news/tagesschau` and `/api/news/wotc` then just read the
   current `news_items` rows for their source - no outbound HTTP call ever
   happens on the request path itself, so a scraper breaking never makes
   the homepage slow.

## Data model

- `scryfall_cache` (`cache_key`, `response_json`, `expires_at`) - cache-aside
  for every Scryfall call shape (search/card/by-name/printings)
- `commander_spellbook_cache` (`card_name`, `response_json`, `expires_at`) -
  combos per card; name predates the EDHREC switch (docs/adr/0016)
- `scryfall_throttle` - single row, last-outbound-call timestamp for the
  ~100ms spacing rule
- `news_items` (`source`, `headline`, `teaser`, `url`, `published_at`,
  `fetched_at`, `sort_order`) - replaced wholesale per source on each
  successful WebCron run
- `wotc_news_fallback` - admin-editable via phpMyAdmin, seeded with one row
  so the WotC panel is never truly empty
- `mtg_meta_entries` (`category`, `name`, `url`, `num_decks`, `sort_order`,
  `fetched_at`) - replaced wholesale per category on each successful
  WebCron run
- No tables for chess (client-only) or auth/marketplace (extracted, see
  docs/adr/0009)

See `api/sql/schema.sql` for the exact schema - applied automatically in
local docker-compose, applied manually once via phpMyAdmin/CLI on IONOS.

## Deployment

`docker-compose.yml` runs three services locally: `mariadb`, `php`
(`php:8.3-apache` with `mod_rewrite` + `AllowOverride All`, matching the
real IONOS Apache host, port 8081), `frontend` (Vite dev server, port
5173, proxying `/api` to the `php` service). This is dev/staging only -
there is no IONOS-hosted preview environment (docs/adr/0009).

`.github/workflows/deploy.yml` builds the frontend and SFTP-uploads
(direct SFTP protocol, not rsync-over-ssh - IONOS Webhosting Plus only
exposes the SFTP file-transfer subsystem, not a full SSH shell)
`frontend/dist/*` and `api/*` into the same IONOS Webhosting Plus space
(sheoforge.de) on push to `main`, one job, one destination, no CORS. A
root `.htaccess` (`frontend/public/.htaccess`, copied into `dist/` at
build time) falls back to `index.html` for any path that isn't a real
file, so client-side routes survive a direct load/refresh. Needs
`IONOS_SFTP_HOST`/`_USER`/`_PASSWORD` as GitHub repo secrets - see
`docs/deploy-checklist.md`. CI (`.github/workflows/ci.yml`) runs frontend
lint/test/build, a `php -l` syntax check over `api/`, and the PHPUnit
suite (`api/tests/`, against a real MariaDB service container) on every
PR/push to `main`.

## Why these decisions

Each non-obvious choice - the Scryfall proxy pattern, the sidebar library,
chess/legal-content scope for v1, and the PHP/MySQL/IONOS migration itself
- has its own ADR under `docs/adr/`, including the alternatives considered
and the trade-offs accepted. This document is the map; the ADRs are the
reasoning.
