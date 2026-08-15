# ADR-0011: Boardgame Lookup — on-demand cache-aside via BGG XML API2

## Status
Accepted (design + plan only — implementation not started; see
Consequences).

## Context
`docs/project-brief.md` section 6 (issue
[Sheodred/hobbyhub#33](https://github.com/Sheodred/hobbyhub/issues/33))
specs a single-search-box feature: enter a board game name, get back
aggregated star ratings from several review sources, a short "good vs.
bad" summary, and a short playstyle description. The open question,
deliberately left unsettled in the brief: scrape review sites fresh on
every search, or cache each looked-up game's data server-side and only
refetch on a cache miss or TTL expiry. Section 4.5 (MTG Meta) already
established this repo's answer to the same shape of problem — cache
external data server-side, don't scrape sites whose ToS forbids it —
and this ADR applies that reasoning here rather than re-deriving it.

**Data sources investigated:**
- **BoardGameGeek XML API2** (`boardgamegeek.com/xmlapi2`) — free,
  keyless, provides a `search` endpoint and a `thing` endpoint with
  ratings/stats, description, and (via `ratingcomments=1`) user rating
  comments. BGG's own aggregate rating is itself an aggregate across
  its full rater base, not a single opinion. Its ToS restricts the API
  to non-commercial use (no official rate limit is published; ~2
  req/sec is the long-standing community-observed convention).
- **Board Game Atlas**, a former alternative aggregator API, has **shut
  down / gone out of business** — confirmed via search, ruled out.
- No other free, reputable, live JSON review-aggregator API was found.
  A paid third-party reseller (`tcgapis.com`) surfaced but reads as
  self-promotional content and isn't a fit for a free, non-commercial
  hobby project.
- Additional star ratings from other individual review sites (Dice
  Tower, Board Game Quest, etc.) would require scraping; two sampled
  `robots.txt` files didn't forbid general crawling, but per this
  repo's established bar (MTGGoldfish: checked and allowed; Moxfield:
  not checked, so link-out only) each site needs its own explicit
  check before a scraper is written for it. None of that per-site
  verification has been done.

**Verification (council of three independent reviewers, run in
parallel, each briefed on one angle only):**
- **Legality/ToS reviewer — completed.** Found that "HobbyHub carries no
  ads, therefore BGG's non-commercial restriction is satisfied" was
  asserted rather than settled — BGG's commercial-use policy is
  typically evaluated at the product/company level, not one page in
  isolation, and there's no public precedent for "a sibling project by
  the same author is commercial, but this page isn't" being
  automatically fine. Also found the draft displayed BGG's copyrighted
  description text and rating-comment excerpts with no attribution.
  Overall risk rated medium, not low — accepted below as a monitored
  risk, not treated as resolved.
- **Schema/API design reviewer — completed.** Found the disambiguation
  flow (multiple candidate games matching a search) had no way to
  actually resolve to a single game (no id-based follow-up call), and
  that an HTTP-300 status for the disambiguation response would be
  silently dropped by this codebase's real `apiFetch`/`ApiError`
  handling (it only reads `message`/`fieldErrors` off non-2xx bodies).
  Both fixed in the plan. Confirmed sound: single endpoint, `bgg_id` as
  an integer primary key, 502 for upstream BGG failures.
- **Caching/staleness reviewer — did not complete in time.** This is an
  explicit, named gap, not a silent one: the 14-day TTL default and the
  "a miss stays a miss, nothing is negative-cached" failure behavior
  (inherited from `ScryfallClient`'s existing pattern) have not been
  independently stress-tested for this specific feature. Flagged in
  Consequences for the human maintainer to sanity-check before
  implementation starts.

## Decision
**Cache-aside per game, populated on demand, long TTL — not a live
scrape on every search, and not a scheduled/cron-refreshed catalog.**

This directly reuses the existing `cache_aside()` helper
(`api/lib/Cache.php`) and mirrors `ScryfallClient`'s structure
(injectable HTTP fetch for testability, single-row throttle table,
`[key, response_json, expires_at]` cache table shape) — the same
established pattern this repo already uses for Scryfall, just with a
much longer TTL (14 days, vs. Scryfall's 5 minutes) since board game
ratings and descriptions change far more slowly than a competitive
card game's metagame. A live-scrape-every-search approach was rejected
as contradicting the repo's own 4.5 precedent and fighting the
"frictionless, one answer" requirement (BGG responses aren't fast
enough to stack directly into a user's request every time). A
scheduled/cron-refreshed catalog (the EDHREC/MTGGoldfish pattern) was
rejected because it fits a small fixed set of periodically-refreshed
widgets, not open-ended free-text search over BGG's entire catalog —
the same shape problem Scryfall search already solved here, not the
shape MTG Meta solved.

**v1 ships BGG as the sole data source**, honestly labeled as "BGG
community rating" rather than faking multi-site aggregation the repo
hasn't legally cleared yet. The good/bad summary and playstyle blurb
are both derived from BGG's own `thing` response (description text,
plus the highest/lowest-rated fetched comment) — no LLM call, no new
paid dependency. Every response carries a visible "Data via
BoardGameGeek" credit and link-back, added specifically to close the
attribution gap the legality reviewer found.

Full design: `docs/superpowers/specs/2026-08-14-boardgame-lookup-design.md`.
Full implementation plan: `docs/superpowers/plans/2026-08-14-boardgame-lookup.md`.

## Consequences
- New backend surface: `api/lib/BggClient.php`, `api/boardgames/lookup.php`,
  three new MySQL tables (`bgg_lookup_cache`, `bgg_search_cache`,
  `bgg_throttle`), one new HTTP helper (`http_get_xml()` in
  `api/lib/http_client.php`, since BGG returns XML unlike Scryfall/
  EDHREC's JSON). No new cron script — on-demand, not scheduled.
- **BGG access is no longer keyless (discovered 2026-08-15).** The XML
  API now returns `401 Unauthorized` to every unauthenticated call and
  requires a registered application token. This does not change the
  caching decision recorded here, but it blocks the feature until a
  human registers the app — see
  [#40](https://github.com/Sheodred/hobbyhub/issues/40). Registration is
  also the natural moment to settle the commercial-use question below.
- **The commercial-use classification is an accepted, monitored risk,
  not a resolved question.** If BGG or a maintainer ever raises it,
  the fallback is straightforward (add a commercial license, or pull
  the feature) — not revisited further here.
- **The caching/staleness gap is resolved (2026-08-15).** The review
  that didn't complete during verification was replaced by reading the
  code directly: `http_get_raw()` returns `null` for both a transient
  network failure and a real 4xx/5xx, and `cache_aside()` cached that
  `null` unconditionally for the full TTL — so a BGG outage on a
  first-ever lookup would have pinned "not found" for 14 days.
  Maintainer decision: fix it at the root rather than per-client —
  `cache_aside()` now skips the write and returns `null` when the
  fetcher returns `null`. That also fixes `ScryfallClient`,
  `CommanderSpellbookClient`, and `NominatimGeocodeClient`, which had
  the same latent behavior at shorter TTLs. The 14-day TTL stands,
  since a failure can no longer occupy it.
- Multi-site review aggregation, LLM-based summarization, and any
  "save to my list" feature are explicit non-goals for v1 (the latter
  is moot anyway — HobbyHub has no accounts post `docs/adr/0009`).
- Per the maintainer's explicit process for this feature: no code from
  the plan has been executed. This ADR and the plan/spec docs are the
  full deliverable of this pass, on branch `feature/boardgame-lookup`,
  for review before implementation starts.
