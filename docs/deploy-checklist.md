# Deploy checklist

Concrete, project-specific items to work through before HobbyHub goes live
on IONOS Webhosting Plus (sheoforge.de) - not a generic checklist. Each
item names the actual file/setting involved. See `docs/adr/0009` for the
hosting decision and migration reasoning behind this list.

## Blockers (must be done before any real launch)

- [ ] **Legal pages are still placeholder content.** Impressum, Privacy
      Policy, and Terms of Service (see `docs/adr/0006`) use loud bracketed
      placeholders and a dev-only draft-content banner. Have the real text
      reviewed before removing the draft banner and going live.
- [ ] **`api/config.local.php` must exist on the server with real values**
      (copy from `api/config.example.php`) - IONOS has no PHP env-var UI,
      so this gitignored file is the only way `DB_HOST`/`DB_NAME`/
      `DB_USER`/`DB_PASSWORD` get set in production. Without it, `api/`
      falls back to the docker-compose dev defaults (`mariadb`/`hobbyhub`/
      `hobbyhub`/`hobbyhub`), which won't resolve on the real host.
- [ ] **`api/sql/schema.sql` must be applied manually once** via
      phpMyAdmin or the IONOS MySQL CLI - it only auto-applies in local
      docker-compose (`/docker-entrypoint-initdb.d`).

## GitHub repo secrets (for `.github/workflows/deploy.yml`)

| Secret | Purpose |
| --- | --- |
| `IONOS_SFTP_HOST` | SFTP host for the Webhosting Plus space |
| `IONOS_SFTP_USER` | SFTP username |
| `IONOS_SFTP_PASSWORD` | SFTP password |

These need to be added in GitHub's repo settings by hand - not something
set from a CI run.

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

- [ ] `api/sql/schema.sql` applied once (see Blockers above) - no
      migration tool, this project's size doesn't need one; future schema
      changes get applied by hand the same way.
- [ ] Confirm the MySQL/MariaDB database IONOS provisions matches what
      `api/config.local.php` points at (IONOS assigns a `dbXXXXXXXX`-style
      name/user, not `hobbyhub`).

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
