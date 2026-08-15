# ADR-0016: Combos come from EDHREC, not Commander Spellbook directly

- **Status:** Accepted
- **Date:** 2026-08-15
- **Relates to:** [issue #35](https://github.com/Sheodred/hobbyhub/issues/35),
  [ADR-0009](./0009-php-mysql-ionos-migration.md)

## Context

The combos panel on an MTG card detail page called
`backend.commanderspellbook.com` directly. That host's edge returns a bare
nginx 403 to *every* request from the IONOS production host — the bare root
included, with no query at all — while Scryfall answers 200 from the same
machine. It works from a dev machine, so the feature looked fine in
development and was dark in production for as long as it took someone to
notice. `/api/health?checks=1` reproduces it.

Nothing in the request was wrong, so nothing in the code could fix it. The
options were to ask Commander Spellbook to unblock the host — an unbounded
wait on someone else's goodwill — or to get the same data from somewhere
that answers.

EDHREC publishes combo data on its open JSON API, and it is the *same* data:
EDHREC's combo pages are built on Commander Spellbook's database. HobbyHub
already calls `json.edhrec.com` for two of the MTG Meta & Stats widgets, so
that host is known to answer from production.

## Decision

**`EdhrecComboClient` fetches `json.edhrec.com/pages/combos/<slug>.json`,
replacing `CommanderSpellbookClient`.** Every field the panel renders maps
over: `cardviews` are the other cards in the combo (EDHREC already drops the
card being looked up), and `combo.cardIds` / `combo.count` / `combo.results`
give the card count, deck count and produced results. Only the outbound link
changes, from commanderspellbook.com to the EDHREC combo page.

A bonus fell out of the switch: `cardviews[].id` is the **Scryfall card id**,
so the combo panel shows a thumbnail per card built straight from Scryfall's
CDN path (`/small/front/<a>/<b>/<id>.jpg`) with no second lookup, no cache and
no throttle. The old source gave no such handle. The names keep their hover
preview; the thumbnails are `aria-hidden`, since the name is already text
beside them.

Two consequences of EDHREC serving these as static files shaped the client:

- **A card in no combos has no file, and the host answers 403 rather than
  404.** So 403/404 maps to `[]` (a real answer, cached) and everything else
  to `null` (a failure, not cached) — the distinction issue #35 established.
  This is why the client fetches through `http_get_result()`: it needs the
  status code, not just the body.
- **There is no `limit` parameter.** A popular card returns ~100 combos and
  the client slices the first three, so the response is larger than the
  old `?limit=3` call. The 1h cache absorbs it.

**The cache table keeps the name `commander_spellbook_cache`.** Same shape,
same rows, same cached value; renaming it would mean a hand-run migration
through phpMyAdmin against a database unreachable from outside IONOS, which
is the same trade ADR-0015 made and for the same reason.

## Consequences

- The panel works in production again without depending on a third party
  changing their mind.
- The data source is still Commander Spellbook, one hop removed — if EDHREC
  stops publishing combos, the panel goes dark again. The failure is visible
  now rather than silent ("Combo lookup is unavailable right now"), and
  `/api/health?checks=1` probes the exact call the lookup makes.
- Card names are slugged locally (apostrophes dropped, everything else
  non-alphanumeric hyphenated). Names that fall outside that — split cards,
  accented names — slug to a 403 and render as "no combos" rather than an
  error. Marked with a `ponytail:` comment; fix if a real card shows up
  wrong.
- `COMMANDER_SPELLBOOK_BASE_URL` and the three health probes that narrowed
  down the block are gone; the block is documented here instead.
