# ADR-0009: Migrate backend from Spring Boot/PostgreSQL to PHP/MySQL for IONOS Webhosting Plus

## Status
Accepted

## Context
The hosting decision landed on IONOS Webhosting Plus (sheoforge.de, already
paid for). It's classic shared hosting: PHP, MariaDB 10/MySQL 8.0, SFTP
(200GB), and WebCron are available, but there is no way to run a persistent
process — no Java, no Docker, no long-running Node/Spring Boot server.

A live audit of the backend (before any code was touched) found it does
four things beyond auth/marketplace: proxy Scryfall (search/printings/
by-name/single-card), proxy Commander Spellbook (combos), and two
`@Scheduled` jobs (MTG Meta & Stats from EDHREC/MTGGoldfish every 4h,
homepage news from Tagesschau/WotC every 20min).

Auth and Marketplace are being extracted to a separate project
([kluge-boards-and-cards](https://github.com/Sheodred/kluge-boards-and-cards))
regardless of hosting, so they aren't part of this migration.

Two options for the rest: rebuild only the Scryfall proxy in PHP and drop
the Meta/news features, or migrate all four feature areas. Also considered
for CI/CD: IONOS Deploy Now (a separate product) for the frontend, paired
with SFTP for the PHP API.

## Decision
- Migrate all four remaining feature areas (Scryfall proxy, Commander
  Spellbook combos, MTG Meta & Stats, homepage news) to PHP/MySQL, not just
  Scryfall — dropping the other three would mean losing real, working
  features for no reason other than migration effort.
- Scryfall search stays a **live proxy with a short-TTL cache**
  (`scryfall_cache`, 5 min), not a local bulk-data search index — keeps
  Scryfall's full query syntax (colors, types, operators) instead of
  reimplementing a weaker subset.
- The two `@Scheduled` jobs become WebCron-triggered PHP scripts
  (`api/cron/refresh_mtg_meta.php`, `api/cron/refresh_news.php`) that
  replace-on-success into MySQL tables — each WebCron hit is a fresh,
  independent process, so a slow run doesn't block the next one the way an
  in-process scheduler could.
- **IONOS Deploy Now is explicitly not used.** It provisions its own
  filespace with no SFTP access — incompatible with hand-deployed PHP at
  the same domain. One GitHub Actions workflow SFTP-uploads both the built
  SPA and `api/` into the same already-paid Webhosting Plus space instead
  (`.github/workflows/deploy.yml`). Local dev/staging is docker-compose
  only (MariaDB + a `php:8.3-apache` container matching the real Apache
  host) — there is no IONOS-hosted preview
  environment.
- `git tag pre-php-migration` preserves the entire pre-migration codebase
  (including auth/marketplace) before `backend/` is deleted, rather than
  duplicating that code into the sibling repo now.

## Consequences
- Error response shape stays `{"message": "..."}` with the matching HTTP
  status — `frontend/src/lib/apiClient.ts`'s `ApiError` parsing needed zero
  changes.
- All `/api/**` paths are unchanged (routed via `api/.htaccess`), so no
  frontend fetch call site needed a path change either.
- Design choices that were real bugs/fixes in the Java version were
  deliberately ported, not just the feature: no trailing slash on the
  Tagesschau URL (it 308-redirects), `CURLOPT_FOLLOWLOCATION` on every
  outbound call, and the asymmetric "keep cache on failure" (Tagesschau,
  EDHREC) vs. "wipe cache on failure" (WotC, MTGGoldfish) behavior matching
  the real Java implementation.
- Lost, out of scope for this migration: all 60+ backend JUnit tests, with
  no PHP equivalent added — worth naming plainly rather than silently
  losing the coverage.
- A real bug was found and fixed during Phase 3 verification, not
  preserved from Java: Apache's per-directory `.htaccess` rewriting
  restarts matching against the *rewritten* URI, which meant
  `/mtg/cards/by-name` fell through the generic `/mtg/cards/{id}`
  catch-all after its own rule rewrote it. Fixed with the `END` rewrite
  flag on every rule instead of `L`.
