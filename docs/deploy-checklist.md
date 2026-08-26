# Deploy checklist

Concrete, project-specific items to work through before HobbyHub goes live
on IONOS Webhosting Plus (sheoforge.de) - not a generic checklist. Each
item names the actual file/setting involved. See `docs/adr/0009` for the
hosting decision and migration reasoning behind this list.

## Blockers (must be done before any real launch)

- [ ] **Legal pages have real content now, but no professional legal
      review yet.** Impressum, Privacy Policy, and Terms of Service (see
      `docs/adr/0006`, updated 2026-08-06) no longer have bracketed
      placeholders - operator confirmed the private/non-commercial
      classification as final. Have a lawyer review the text (especially
      that classification and the liability clause) before removing the
      dev-only draft banner and going live.
- [x] **`api/config.local.php` exists on the server with real values**
      (2026-08-06, via SFTP) - `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`
      set to the real IONOS-provisioned database (`dbs15977419`).
- [x] **`api/sql/schema.sql` applied manually once** (2026-08-06, via
      phpMyAdmin's SQL tab, database `dbs15977419` selected first) - all 6
      tables created, `wotc_news_fallback` seed row inserted. Direct
      external DB connections (mysql CLI, ODBC from a local machine) are
      firewalled off by IONOS - phpMyAdmin works because it runs inside
      their own infrastructure, not from outside it.

## GitHub repo secrets (for `.github/workflows/deploy.yml`)

| Secret | Purpose |
| --- | --- |
| `IONOS_SFTP_HOST` | SFTP host for the Webhosting Plus space |
| `IONOS_SFTP_USER` | SFTP username |
| `IONOS_SFTP_PASSWORD` | SFTP password |

These need to be added in GitHub's repo settings by hand - not something
set from a CI run.

### When a deploy hangs on "Deploy to IONOS via SFTP"

Happened on 2026-08-16: two runs sat on that step for over an hour with a
**completely empty log**. `mirror --verbose` prints nothing until the first
file moves, so a dead connection and a slow upload look identical.

How to read it:

- **No `Transferring file` line at all** means lftp never got a session -
  the stall is in connect/handshake, not the transfer. Nothing was uploaded,
  so the live site is still whatever the last good deploy left. There is no
  half-mirrored state to clean up.
- **The last good run is the tell.** It had already stalled 5m02s before its
  first byte and then finished normally in 48s. A deploy that suddenly takes
  minutes to start transferring is the same problem, one step earlier.
- Since then the step retries three times with `net:timeout 20` and
  `debug 3`, so an unreachable endpoint now fails in about a minute with a
  logged reason instead of hanging.
- The endpoint is only reachable with the secrets, so test it from a machine
  that has them: `lftp -u USER,PASS sftp://HOST -e "ls; bye"`. If that hangs
  too, it is IONOS, and no workflow change will help until it clears.

Deploys are serialised (`concurrency: deploy-production`), so a second merge
queues behind the first instead of putting two mirrors on one webspace.

## WebCron (IONOS control panel)

- [ ] `api/cron/refresh_news.php` - every 20 minutes (matches the old
      `@Scheduled` interval).
- [ ] `api/cron/refresh_mtg_meta.php` - every 4 hours.

Both are plain URL-triggered scripts (`https://sheoforge.de/api/cron/...`
is blocked from direct access by `api/.htaccess` - WebCron needs the actual
file-system path or a signed URL, whichever IONOS's WebCron UI expects;
confirm the exact invocation method against IONOS's docs when setting this
up, since shared-hosting WebCron products vary here).

## Database

- [x] `api/sql/schema.sql` applied once (see Blockers above) - no
      migration tool, this project's size doesn't need one; future schema
      changes get applied by hand the same way.
- [x] **Scrape caches cleared for the key-facts release (#58)** (2026-08-16,
      via phpMyAdmin's SQL tab):
      `DELETE FROM hall9000_cache; DELETE FROM brettspiele_report_cache;`
      Their stored rows predated the `age` and `complexity` keys and were
      hiding both fields. 3 rows and 0 rows respectively - only H@LL9000 had
      anything cached. Verified live afterwards: `?q=We will Wok you` now
      answers `age: "ab 10 Jahren"` and `complexity: 4/20`.

      Any future change to what a scrape client extracts needs the same
      clear - see the cache entry in `docs/agents/pitfalls.md`.
- [x] **`bgq_review_cache` cleared for the "How it plays" truncation fix
      (#178)** (2026-08-24, via phpMyAdmin's SQL tab: `DELETE FROM
      bgq_review_cache;`). `BoardGameQuestClient::section()` used to cut its
      320-char excerpt with a plain `mb_substr`, landing mid-word as often
      as not; existing cached rows held that badly-cut text baked in and
      would not have self-healed until their 14-day TTL expired. Same class
      of issue as the #58 entry above. Verified live afterwards: bgg_id
      454672 (the game from the original report) now ends its excerpt
      cleanly at a word boundary.
- [x] **`bgg_rank` column added and filled for #58** (2026-08-16, via
      phpMyAdmin - IONOS firewalls off external database connections, so the
      CLI importer has no path here). `ALTER TABLE bgg_ranks ADD COLUMN
      bgg_rank INT NULL;` followed by a generated helper-table import of the
      2026-08-15 dump: 31,137 ranks, verified live afterwards (Brass:
      Birmingham #1, Azul #99, expansions correctly NULL since BGG ranks
      those separately).

      A future dump refresh needs the same treatment, or `bgg_rank` goes
      stale while the other columns update - the CLI importer writes it, but
      only reaches the dev database.

- [x] **The 8 `*_rank` category columns filled for #179** (2026-08-26, via
      phpMyAdmin, same reason as the `bgg_rank` entry above). The columns
      themselves shipped with #194 and were added manually the day before;
      this filled them from the 2026-08-25 dump. Only 15,306 of the dump's
      180,392 games carry any category rank, so the generated SQL was a
      734 KB helper-table import (`CREATE` -> batched `INSERT` -> `UPDATE
      ... JOIN` -> `DROP`), touching those 8 columns and nothing else.
      15,306 rows updated; verified live afterwards on
      `/api/boardgames/top.php` (Brass: Birmingham Strategy #1, Pandemic
      Legacy S1 Strategy #3 + Thematic #1).

      Note this was a category-only import: `bgg_rank`, `average` and
      `users_rated` in production still come from the 2026-08-15 dump.

- [x] Confirmed the MySQL/MariaDB database IONOS provisions matches what
      `api/config.local.php` points at (`dbs15977419` / `dbu2649442` /
      `db5021097409.hosting-data.io`, not `hobbyhub`).

## Frontend

- [x] Production build via `npm run build` (Vite, `frontend/dist/`) -
      uploaded by the deploy workflow, not built on the server.
- [x] SPA-fallback `.htaccess` (`frontend/public/.htaccess`, copied into
      `dist/` at build time) so a direct load or refresh on a client-side
      route (e.g. `/mtg/meta`) doesn't 404 on Apache.
- [ ] No CORS config needed - frontend and API share the same origin
      (sheoforge.de) once deployed, per docs/adr/0009.

## Hosting

Decided: **IONOS Webhosting Plus** (sheoforge.de, already paid for) via a
single GitHub Actions SFTP workflow uploading both the built SPA and
`api/` into the same webspace. See `docs/adr/0009` for why IONOS Deploy Now
was considered and rejected. Nothing further to decide here.

**Domain root is `/public`, not the SFTP/webspace root** (confirmed
2026-08-06 via IONOS panel "Webspace verbinden" - absolute path
`/home/www/public`). `deploy.yml` uploads to `./public/` and
`./public/api/` accordingly - `api/config.local.php` must live at
`/home/www/public/api/config.local.php` for the app to find it.

## After going live

- [ ] Point DNS at sheoforge.de if not already, confirm HTTPS works
      end-to-end.
- [ ] Smoke-test MTG search/detail/printings/combos, the Meta & Stats page,
      both homepage news panels, and chess against the real deployment -
      not just CI or local docker-compose.
- [ ] Manually trigger both cron scripts once right after the first
      deploy, so the news/meta tables aren't empty until the first
      WebCron-scheduled run.
- [ ] Remove the dev-only draft-content banners once real legal-page
      content is live (`DraftContentNotice` usages).
