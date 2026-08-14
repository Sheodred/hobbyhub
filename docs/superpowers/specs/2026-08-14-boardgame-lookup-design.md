# Boardgame Lookup — Design Spec

Date: 2026-08-14
Issue: [Sheodred/hobbyhub#33](https://github.com/Sheodred/hobbyhub/issues/33)
Spec source: `docs/project-brief.md` section 6

## Problem

A user types a board game name into one search box and gets back, in one
answer: aggregated star ratings from several review sources, a short
"good vs. bad" summary distilled from those reviews, and a short
playstyle description. The experience must be as frictionless as
possible — one box in, one answer out.

The open architecture question (explicitly not settled in the brief):
scrape review sites fresh on every search, or cache each looked-up
game's data server-side and only refetch on a cache miss or TTL expiry.

## Research findings (grounding for the decision below)

- **BoardGameGeek XML API2** (`boardgamegeek.com/xmlapi2`) is free,
  keyless, and provides a `search` endpoint (free-text → candidate game
  ids) and a `thing` endpoint (ratings/stats, description, and — via
  `&ratingcomments=1` — user rating comments). Its own aggregate rating
  (`stats.average` / `stats.bayesaverage`) is itself already an
  aggregate across BGG's full rater base (often thousands of raters per
  game), not a single reviewer's opinion.
  - ToS (`XML_API_Terms_of_Use`) restricts the API to **non-commercial**
    use; a commercial license is required otherwise. HobbyHub itself is
    a personal, ad-free hobby/portfolio site — the marketplace/commerce
    surface was extracted to a separate project (`docs/adr/0009`)
    specifically so the parts that remain here aren't commercial.
    **Verification finding (legality reviewer):** BGG's commercial-use
    policy is generally evaluated at the product/company level, not a
    single ad-free page in isolation, and there's no public precedent
    for "sibling project by the same author is commercial, but this
    page isn't" being automatically fine. This is **not** a settled
    question — it's an accepted, monitored risk, not a resolved one
    (see ADR).
  - **Verification finding (legality reviewer):** the plan as drafted
    displayed BGG's copyrighted `description` text and cherry-picked
    user rating comments with no attribution or link-back. Fixed below:
    every response includes a "Data via BoardGameGeek" credit + link to
    the game's BGG page.
  - No officially documented rate limit; ~2 req/sec is the long-standing
    community-observed convention (BGG staff/mod threads), and some BGG
    endpoints (e.g. collection export) use an async queue/202 pattern
    under load. Treat this the same way `ScryfallClient::throttle()`
    treats Scryfall's guideline: a best-effort single-row MySQL
    throttle, not a hard guarantee.
- **Board Game Atlas** (former alternative aggregator API,
  `boardgameatlas.com`) has **shut down / gone out of business**
  (confirmed via search, multiple independent sources including a
  BGG forum thread and a third-party app's blog post about losing the
  integration). Not viable — ruled out, not silently forgotten.
- No other free, reputable, live JSON review-aggregator API was found.
  One paid third-party reseller (`tcgapis.com`) surfaced in search
  results with content that reads like self-promotional SEO copy; it's
  a paid commercial product, not a fit for "free, non-commercial hobby
  API" and is **not** recommended as a source.
- "Several review sites" beyond BGG would require scraping individual
  review sites (Dice Tower, Board Game Quest, etc.). Sampled two
  candidates' `robots.txt` — neither disallows general content crawling
  — but per this repo's established bar (MTGGoldfish: checked and
  allowed; Moxfield: not checked, so link-out only), each specific site
  still needs its own explicit robots.txt/ToS check **before** any
  scraper for it is written. None of that per-site verification has
  been done yet, so no non-BGG scraping ships in v1 (see Scope below).

## Approaches considered

**A. Live fetch on every search, no cache.** Rejected. Contradicts the
repo's own established precedent (project-brief 4.5: "cache external
data server-side ... don't call out on every page load"); every search
would stack a BGG `search` call + a `thing` call (BGG responses are not
fast) directly into the user's request, which fights the "frictionless,
one answer" requirement; repeats load on BGG (and any scraped site) for
the same popular games searched by different visitors, which is poor
API citizenship even where allowed.

**B. Cache-aside per game, populated on demand, TTL-based staleness.**
**Recommended.** Same shape as `ScryfallClient`/`Cache.php`'s
`cache_aside()`, already proven in this codebase: on search, resolve
free text to a BGG game id, check the cache table for a non-expired row
for that id, return it instantly on a hit, otherwise fetch fresh from
BGG (+ throttle), synthesize the response, `REPLACE INTO` the cache
table, and return it. TTL is long (board game ratings/descriptions
change slowly — nothing like MTG's Standard metagame) rather than
Scryfall's 5 minutes.

**C. Scheduled/cron-refreshed cache (EDHREC/MTGGoldfish pattern).**
Rejected as the primary mechanism. That pattern fits a *small fixed
set* of periodically-refreshed widgets ("top 3 commanders this week").
Boardgame Lookup is the opposite shape: open-ended free-text search
over BGG's entire catalog (tens of thousands of games), so pre-warming
or cron-refreshing "the catalog" doesn't make sense — it's the same
shape problem Scryfall search already solved in this repo, not the
shape MTG Meta solved.

## Decision

**Approach B: on-demand cache-aside, keyed by BGG game id, long TTL,
refreshed on miss or expiry.** This directly reuses the existing
`cache_aside()` helper and mirrors `ScryfallClient`'s structure
(injectable HTTP fetch for testability, single-row throttle table,
cache-aside table shaped `[key, response_json, expires_at]`).

### Search/resolve flow

1. User submits free text to `GET /api/boardgames/lookup?q=...`, OR the
   frontend calls the same endpoint with `GET
   /api/boardgames/lookup?bgg_id=...` after a disambiguation pick (see
   step 3) — a single endpoint, one optional extra param, still "one
   search box in" from the user's perspective (the second call is
   internal, triggered by clicking a disambiguation option, not a
   second thing the user types). **Added in verification** (schema/API
   reviewer): the original draft only defined the free-text path, which
   had no way for a disambiguation pick to actually resolve to a game.
2. If `bgg_id` was passed directly, skip to step 4. Otherwise, check a
   small **name-resolution cache** (`bgg_search_cache`, keyed by
   normalized lowercased query text) for a previously-resolved BGG id.
   On a hit, skip to step 4.
3. On a miss, call BGG `search?type=boardgame&query=...` (throttled).
   - No match → `{"status": "not_found"}`, 404, nothing cached.
   - Exactly one strong match → resolve directly.
   - Multiple plausible matches → respond `200` with
     `{"status": "disambiguation", "candidates": [{"bggId", "name",
     "yearPublished"}, ...]}` instead of guessing; the frontend shows it
     as a pick-one step, and each candidate click re-calls the endpoint
     with `bgg_id`. **Changed in verification** (schema/API reviewer):
     the original draft proposed an HTTP 300 status for this. That
     doesn't work with this codebase's `apiFetch` (`frontend/src/lib/
     apiClient.ts`), which treats any non-2xx as a failure and discards
     the body except `message`/`fieldErrors` — a real candidate list
     would have been silently dropped. Using `200` with a discriminated
     `status` field needs zero changes to `apiClient.ts`, matching the
     "no frontend fetch call site needs a path/shape change" bar the
     rest of this codebase's proxies hold to.
   - Cache the resolved `query → bgg_id` mapping (only once
     disambiguated, i.e. only the actually-chosen id, not the whole
     candidate list) with its own TTL.
4. Check `bgg_lookup_cache` for a non-expired row keyed by `bgg_id`.
   Hit → return the cached synthesized response (`{"status": "ok",
   "game": {...}}`) immediately.
5. Miss → call BGG `thing?id=...&stats=1&ratingcomments=1` (throttled),
   build the synthesized response (see below), `REPLACE INTO` the cache
   table, return it.

### What "aggregated star ratings from several review sources" means in v1

v1 ships with **BGG only**, framed honestly as "BGG community rating"
(itself an aggregate of BGG's rater base — this is real aggregation,
just not multi-site aggregation). Multi-site scraping is **out of
scope for v1** and left as a follow-up task in the implementation plan,
gated on doing the same per-site robots.txt/ToS check this repo already
requires before any scraper is written — not something to guess at
generically. This is a deliberate scope cut, not an oversight: better to
ship one legally-clean source honestly labeled than to fake "several
sites" with unverified scraping.

### "Good vs. bad" summary and playstyle description

Derived entirely from BGG's own `thing` response — no new external
dependency, no LLM API call (would be a new paid dependency for a hobby
project; not justified for v1):
- **Playstyle**: BGG's own game `description` field, truncated/cleaned
  (BGG descriptions are HTML-entity-encoded free text) to a short blurb.
- **Good vs. bad**: from the rating comments returned by
  `ratingcomments=1`, pick the highest-rated comment (closest to 10) as
  "good" and the lowest-rated comment (closest to 1) as "bad", each
  truncated to a short snippet. Simple, deterministic, no summarization
  model needed. If BGG returns too few comments to pick from, omit the
  weaker side gracefully rather than showing empty/placeholder text.

### Cache schema (mirrors `scryfall_cache` shape)

**Renamed in verification** (schema/API reviewer): the original draft
mixed a domain prefix (`boardgame_*`) with a source prefix
(`bgg_throttle`), inconsistent with the existing `scryfall_cache`/
`scryfall_throttle` pair, which are both source-prefixed. All three
tables below are now `bgg_*`, matching `BggClient` and the Scryfall
precedent.

```sql
CREATE TABLE bgg_lookup_cache (
    bgg_id INT PRIMARY KEY,
    response_json LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

CREATE TABLE bgg_search_cache (
    query_key VARCHAR(255) PRIMARY KEY,
    bgg_id INT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- Single row, mirrors scryfall_throttle - spaces outbound BGG calls
-- per the ~2 req/sec community convention (500ms min interval).
CREATE TABLE bgg_throttle (
    id TINYINT PRIMARY KEY DEFAULT 1,
    last_call_at DOUBLE NOT NULL
);
```

TTL is a class constant on `BggClient` (same convention as
`ScryfallClient::CACHE_TTL_SECONDS`), default **14 days** — configurable
by changing the constant, not a runtime setting (no admin UI exists for
this and none is being added). Exact number is intentionally a "pick a
reasonable default, easy to change later" call, not a researched
optimum — flagged for the caching-correctness reviewer in verification.

### Backend shape

- `api/lib/BggClient.php` — new, mirrors `ScryfallClient.php`: injectable
  HTTP fetch, `cached()` wrapper over `cache_aside()`, `throttle()`
  mirroring `ScryfallClient::throttle()` against `bgg_throttle`.
- `api/boardgames/lookup.php` — new endpoint, mirrors `api/mtg/search.php`
  (`$q` or `$bgg_id` required, 400 if both blank, try/catch → generic
  500 + `error_log`). Every `"status": "ok"` response includes a
  `"source": {"name": "BoardGameGeek", "url": "https://boardgamegeek.com/boardgame/<bgg_id>"}`
  field — **added in verification** (legality reviewer): the draft
  displayed BGG's copyrighted description text and rating-comment
  excerpts with no attribution or link-back; this closes that gap.
  Frontend renders it as a visible credit line, not just metadata.
- No new cron script — this is on-demand, not scheduled, same as
  Scryfall (contrast with `api/cron/refresh_mtg_meta.php`).
- `api/sql/schema.sql` gets the three new tables appended.

### Error handling

- Blank query → 400.
- BGG search returns no candidates → 404-shaped `{"message": "..."}`,
  nothing written to cache (matches `ApiError` parsing already in
  `frontend/src/lib/apiClient.ts`, needs no frontend changes there).
- BGG unreachable/errors on a cache miss → 502-shaped error; **do not**
  wipe or write a negative cache entry — same "don't cache a failure as
  if it were data" instinct as the existing clients, though note this
  differs from the MTGGoldfish/WotC "wipe cache on failure" behavior,
  which applies to *scheduled* jobs refreshing a *shared* widget, not to
  a *per-key* on-demand cache — there's nothing to "wipe" per key here,
  a miss just stays a miss until the next request retries.
- Ambiguous match → 300-shaped disambiguation payload (list of
  candidates), not an error — the frontend renders it as a pick step.

### Testing

Mirrors `api/tests` conventions already established for `ScryfallClient`
and the cron refresh classes: PHPUnit tests for `BggClient`'s
cache-aside behavior (hit/miss/expiry) with the outbound HTTP call
faked via the injected callable, against a real MySQL/MariaDB service
container — not mocking the database, matching
`docs/adr/0009`'s stated testing approach.

## Verification pass

Per this repo's process, the draft above went through independent
critique before being finalized: three reviewers, each briefed on one
angle only (data-source legality/ToS, caching/staleness correctness,
schema/API design), run in parallel as background agents.

- **Legality/ToS reviewer — completed.** Found the "no ads → BGG's
  non-commercial restriction is satisfied" line was asserted rather
  than settled, and that BGG's copyrighted text was being redistributed
  with no attribution. Both are addressed above (reframed as an
  accepted/monitored risk; attribution + link-back added to every
  response).
- **Schema/API design reviewer — completed.** Found the disambiguation
  flow had no way to actually resolve to a game (missing `bgg_id`
  bypass param), that the proposed HTTP-300 disambiguation response
  would be silently dropped by this codebase's real `apiFetch`/`ApiError`
  handling, and a table-naming inconsistency. All three fixed above.
  Confirmed as sound, no change needed: the single-endpoint shape,
  `bgg_id INT PRIMARY KEY`, and using a 502 for upstream BGG failures.
- **Caching/staleness reviewer — did not complete.** This review was
  dispatched alongside the other two but did not return a result in
  time. **This is a known, explicitly flagged gap, not a silent
  omission** — the 14-day TTL default, the no-locking cache-aside
  pattern under concurrent first-time lookups, and the "miss stays a
  miss, no negative caching" failure behavior (all described above) have
  **not** been independently stress-tested. The ADR marks this as an
  open item for the human maintainer to sanity-check before
  implementation starts, rather than presenting it as verified when it
  wasn't.

## Non-goals for v1 (explicit, not silent scope cuts)

- Multi-site review scraping beyond BGG (needs its own per-site
  ToS check first).
- LLM-based summarization of the good/bad blurb.
- Any admin/manual-curation fallback UI (no precedent need identified
  yet — BGG has no announced deprecation risk like WotC's RSS feed did).
- Saving/favoriting looked-up games to a member list (no accounts exist
  in HobbyHub post-migration anyway, per `docs/adr/0009`).
