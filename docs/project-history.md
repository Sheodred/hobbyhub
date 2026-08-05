# Project history

A narrative account of how HobbyHub actually grew, the real pitfalls hit
along the way, and how each was resolved — as opposed to `docs/adr/` (the
reasoning behind individual decisions) or `docs/project-brief.md` (the
original spec, annotated against final state). This document is the story
in between: what happened, in what order, and why some things changed
mid-course. Sourced from git history (`git log --merges`) and this
project's own working record.

## Origin: scaffold to v1 (PRs #1-#7, 2026-08-04 to 2026-08-05)

The app was built from a single detailed brief (`docs/project-brief.md`)
phase by phase, each phase its own branch → PR → CI-green → merge cycle:
monorepo scaffold, app shell (resizable sidebar, mobile drawer, route
transitions), JWT auth, homepage, About Me + legal pages, the MTG card
browser (Scryfall proxy), the Marketplace, and chess vs. AI (client-side
Stockfish). By PR #7 the app matched the original brief's core feature
set end to end.

## Hardening pass (PRs #8-#17)

A second pass fixed real bugs found through live use rather than unit
tests alone: marketplace image handling and MTG printing display (#8),
chess piece contrast (#9), an accessibility audit covering keyboard nav,
focus rings, and WCAG AA contrast fixes including `MobileDrawer`'s modal
behavior (#13), a production frontend build (multi-stage Dockerfile, nginx
serving the static bundle instead of Vite's dev server, #14), and
`UserController` test coverage (#15). Architecture docs (#10) and a deploy
checklist (#16) were written alongside the code, not bolted on afterward.

## Organic growth (PRs #18-#29)

Once the core brief was satisfied, the project kept growing past its
original scope on explicit request: three homepage info panels
(Tagesschau news, WotC news, weather — #19-#21), an MTG Meta & Stats page
pulling from EDHREC and MTGGoldfish (#22), a related-combos panel via the
Commander Spellbook API with card-name hover previews (#23, #26), an
animation-timing polish pass using real design-skill guidance (#24), and a
GDPR/Privacy Policy review that caught and disclosed a real gap — the
weather panel sends geolocation straight to Open-Meteo from the browser,
bypassing the backend entirely, which the original Privacy Policy draft
didn't mention (#25). A separate MTG fan-game project
([mtg-planeswalk](https://github.com/Sheodred/mtg-planeswalk)) was spun up
at the concept/lore stage only, and a lore-chatbot infrastructure design
(dedicated Elasticsearch, `docs/adr/0008`) was written up and deliberately
left unbuilt — an explicit "roadmap, not now" decision, not an oversight.

## Real pitfalls hit along the way

These weren't hypothetical risks — each one actually happened during the
build and shaped a concrete design decision afterward.

**A silently-swallowed HTTP redirect (Tagesschau news panel).** The
scheduled news refresh hung, then silently returned zero headlines.
Root cause: Tagesschau's API 308-redirects the trailing-slash path, and
neither a naive request nor an unconfigured HTTP client followed it — it
just looked like "no news today" instead of an error. Fixed by dropping
the trailing slash and adding an explicit redirect-follow + timeout
configuration. The first fix attempt made this worse: setting the timeout
directly in the client's own constructor also silently overwrote the
request factory `MockRestServiceServer` had already installed in unit
tests, breaking them for an unrelated reason. Moving the timeout config to
a shared bean applied via dependency injection fixed both problems at
once — production got the timeout, tests (which construct their own
client) didn't get clobbered. This exact bug class (unfollowed redirect →
silent empty result) was deliberately re-guarded against later in the PHP
migration: `CURLOPT_FOLLOWLOCATION` became a standing default on every
outbound call, not just Tagesschau's, specifically so it couldn't
reappear in a different client.

**Trusting stale local git state over a saved memory.** Mid-session, a
`git log` on a never-fetched local `main` stopped at PR #7, contradicting
a saved memory that described PRs #8-#11 as real and merged. The
conclusion drawn at the time — that the memory must have been
hallucinated — was wrong and got written down as a "correction" before
being checked further. Running `git fetch origin` (for an unrelated
reason) revealed PRs #8-#11 were real; the false correction had to be
reverted, a duplicate PR opened on the wrong premise had to be closed, and
local `main` fast-forwarded. The lesson that stuck: always `git fetch
origin` before trusting local `git log`/`git branch -a`, especially when
it contradicts another account of what's already been done — a stale
local view is more likely than a fabricated memory.

**An assumption about hosting compatibility that didn't survive research.**
The original plan for the IONOS migration assumed IONOS Deploy Now
(frontend) and classic SFTP (the PHP API) could coexist at the same
domain. They can't — Deploy Now provisions its own separate filespace with
no SFTP access at all, which would have meant a subdomain split and CORS
for no real benefit at this project's scale. Caught by research before any
code was written around the wrong assumption, and the plan was revised to
a single SFTP-based deploy for both frontend and API into one webspace
(`docs/adr/0009`).

**A rewrite rule that looked correct in isolation.** During the PHP
migration's local-verification gate (`docs/adr/0009`, Phase 3), the
`/mtg/cards/by-name` route returned a 404 that made no sense — the same
query worked fine directly against Scryfall. The cause: Apache's
per-directory `.htaccess` rewriting restarts matching against the
*rewritten* URI, not just the original request. `mtg/cards/by-name`
correctly rewrote to `mtg/cards/by-name.php`, but that result then
re-entered the ruleset and matched the generic `/mtg/cards/{id}`
catch-all below it, turning into `mtg/cards/get.php?id=by-name.php`. The
`L` flag stops the *current* pass, not the restart — switching every rule
to the `END` flag (which stops rewrite processing outright) fixed it. This
was caught specifically because Phase 3 required live end-to-end
verification in a browser before `backend/` could be deleted, not because
any unit test would have caught an Apache routing quirk.

## The hosting-driven backend rewrite (2026-08-05)

The single largest change after the original build: migrating the entire
backend from Java/Spring Boot/PostgreSQL to PHP/MySQL, to run on IONOS
Webhosting Plus shared hosting — which cannot run a persistent JVM
process. A live audit (required before touching any code) found the
backend did more than expected: not just the Scryfall proxy, but also
Commander Spellbook combos, MTG Meta & Stats, and homepage news. All four
were migrated, not just Scryfall, preserving Scryfall's full live query
syntax (explicitly rejecting a local bulk-data search index, which would
have lost search operators). Auth and Marketplace were extracted to a
separate project instead of being ported. The old codebase wasn't deleted
until a full local docker-compose stack (MariaDB + `php:8.3-apache`,
matching the real IONOS Apache host) proved every feature worked
end-to-end — see `docs/adr/0009` for the full decision record and the
`pre-php-migration` git tag for the preserved pre-migration source.

## Where this leaves things

The current architecture, feature-by-feature ownership, and data model are
documented in `docs/architecture.md`; every individual technical decision
(including the ones superseded by the migration) is in `docs/adr/`; the
concrete pre-launch checklist is in `docs/deploy-checklist.md`. This
document won't be kept perfectly up to date going forward — treat it as a
snapshot of how the project got to where `docs/architecture.md` describes
it now, not a living log.
