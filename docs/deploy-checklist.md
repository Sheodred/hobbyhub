# Deploy checklist

Concrete, project-specific items to work through before HobbyHub goes live -
not a generic checklist. Each item names the actual file/setting involved.

## Blockers (must be done before any real launch)

- [ ] **Legal pages are still placeholder content.** Impressum, Privacy
      Policy, and Terms of Service (see `docs/adr/0006`) use loud bracketed
      placeholders and a dev-only draft-content banner. Have the real text
      reviewed (ideally by a lawyer, given the marketplace sells goods)
      before removing the draft banner and going live.
- [ ] **Password-reset emails aren't actually sent.** Per `docs/adr/0007`,
      v1 only logs/returns the reset token under the `dev` Spring profile -
      there is no real SMTP delivery yet. Either wire up Spring Mail + a
      provider (Resend, Mailtrap, etc.) first, or launch without the
      password-reset flow enabled.
- [ ] **`SPRING_PROFILES_ACTIVE` must not be `dev` in production** - the dev
      profile exposes password-reset tokens directly in the API response
      (see `docker-compose.yml`'s comment on this). Set it to a real `prod`
      profile (or leave it unset once dev-only beans are profile-gated).

## Required environment variables (production values, not the dev defaults)

All of these currently fall back to insecure dev defaults baked into
`backend/src/main/resources/application.yml` - every one of them must be
set explicitly for a real deployment:

| Variable | Dev default | Production requirement |
| --- | --- | --- |
| `JWT_SECRET` | `dev-only-secret-...` | A real random secret, 32+ bytes (HMAC-SHA256 requirement) |
| `DATABASE_URL` / `DATABASE_USER` / `DATABASE_PASSWORD` | `hobbyhub`/`hobbyhub` | Real managed-Postgres credentials, not the docker-compose defaults |
| `CORS_ALLOWED_ORIGIN` | `http://localhost:5173` | The real frontend origin (e.g. `https://hobbyhub.example.com`) |
| `COOKIE_SECURE` | `true` | Already correct - just confirm it isn't accidentally overridden to `false` |

## Database

- [ ] Flyway (`spring.flyway.enabled: true`) runs migrations automatically
      on backend startup - fine for this project's size, but take a backup
      before deploying any release that includes a new migration.
- [ ] Decide where Postgres actually runs in production (see hosting below)
      - `docker-compose.yml`'s `postgres` service with a named volume is
      dev-only; a real deployment needs either a managed Postgres instance
      or a VPS volume with an actual backup strategy.

## Frontend

- [x] Production build (multi-stage Dockerfile -> nginx, done - frontend no
      longer runs Vite's dev server in the container).
- [ ] Point `CORS_ALLOWED_ORIGIN` at the real deployed frontend URL once
      it's known.

## Hosting (proposed - confirm before committing to it)

Given the whole stack is already `docker compose`-shaped (frontend, backend,
Postgres, no other infra dependencies), the least-new-tooling path is a
small VPS running that same `docker-compose.yml` directly, fronted by
[Caddy](https://caddyserver.com/) for automatic HTTPS - e.g. a Hetzner CX22
(~4-5 EUR/month). This avoids learning a new platform's deploy model for a
personal project and reuses everything already built.

Alternative if less server ops is preferred: a managed platform like
[Render](https://render.com/) (web service + managed Postgres, both have
usable free/low tiers) - less control, no server to patch, but the app
would need to be split into two separate Render services instead of one
`docker compose up`.

**This is a recommendation, not a decision already made - confirm which
direction before spending money or setup time on either.**

## After going live

- [ ] Point DNS at the chosen host, confirm HTTPS works end-to-end.
- [ ] Smoke-test the full auth flow (signup/login/logout) and one write path
      per feature (create a marketplace listing, play a chess move) against
      the real deployment, not just CI.
- [ ] Remove the dev-only draft-content banners once real content is live
      everywhere it appears (`DraftContentNotice` usages).
