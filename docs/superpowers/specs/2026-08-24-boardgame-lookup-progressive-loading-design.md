# Boardgame Lookup — Progressive Loading Redesign

Date: 2026-08-24
Issues: [Sheodred/hobbyhub#180](https://github.com/Sheodred/hobbyhub/issues/180) (cache TTLs, timing investigation), [Sheodred/hobbyhub#186](https://github.com/Sheodred/hobbyhub/issues/186) (progressive display)

## Problem

A cold-cache boardgame lookup takes **24.2 seconds** end to end, measured
live against production (`bgg_id=169786`, Scythe, first-ever lookup) - the
same request warm afterwards takes 0.08s. The user sees nothing but a
"Loading the other sources..." message for the entire 24s.

Root cause: `api/boardgames/lookup.php` is a single synchronous PHP
script that fetches BGG's own data, then four rating sources
(Amazon/Board Game Quest/H@LL9000/brettspiele-report) **sequentially**
via a plain `foreach` in `collect_ratings()`, then the retail price
sources, and only sends one JSON response once every one of those has
completed or been skipped. This is not a deliberate design choice - it
is accumulated debt from six separate features (#90, #105, #113, #131,
#172, and BGG itself) each bolting one more blocking call onto the same
endpoint, none of which felt slow in isolation.

Per-source cold timing (measured locally, for context - the 24.2s
production figure above is the number that matters):

| Source | Throttle + fetch | Feeds |
|---|---|---|
| BGG itself | ~20ms (usually already warm) | name, description, image, facts, categories, own rating/rank, good/bad |
| Board Game Quest | ~2.4s (slowest miss) | How-it-plays text, own rating, good/bad fallback |
| Brettspielpreise.de | ~1.6s | retail price |
| Amazon.de | ~0.2-1.9s (throttle-queue dependent) | own rating, retail price (one fetch serves both) |
| H@LL9000 | ~0.7s | facts (players/duration/age), own rating |
| brettspiele-report | ~0.6s | complexity, own rating |

## Additional findings folded into this redesign

While tracing the facts row (players/duration/age) for the loading-order
question, found two more real bugs worth fixing in the same pass since
it's the same data path:

1. **BGG's own `duration`/`age` fields are hardcoded German** regardless
   of the page's DE/EN toggle (`BggClient::durationRange()` returns
   `"$value Minuten"`, `ageLabel()` returns `"ab {$age} Jahren"`,
   unconditionally). `players` has no unit word at all and the frontend
   hardcodes English `"players"`. Three fields, three inconsistent
   treatments, none of them toggle-aware.
2. **H@LL9000 currently replaces a field wholesale** whenever it has an
   entry (`$hall['players'] ?? $game['players']`), even when BGG already
   answered that same field - not a per-field gap-fill.

## Decision

Split the single `lookup.php` into **six endpoints, one per external
source** (not one per UI section - Amazon and Board Game Quest each feed
2-3 UI sections, and a per-section split risks firing two concurrent
requests at the same live source before either's cache row is written,
paying its throttle cost twice). The frontend fires all six in parallel
right after the existing instant local answer, and each affected UI
section carries its own small loading indicator until its source(s)
resolve - replacing the single global "Loading the other sources..."
message entirely.

### Approaches considered

**A. Parallelize inside one endpoint (`curl_multi_exec`).** Cuts total
time from the sum of throttles to roughly the max of them (~2.4s instead
of ~5s+ for the rating sources), no frontend change needed. Rejected as
the primary approach (not what was asked for) but worth keeping in mind
as a smaller, lower-risk option if the six-endpoint split turns out to
be too large a change later - it doesn't give per-section progressive
display, which is the actual goal here.

**B. Six endpoints, frontend fires all in parallel (chosen).** Real
progressive display: BGG's fast core renders almost immediately, each
external section fills in independently as its own source answers.
Matches the existing instant-local + full-lookup two-phase pattern
already in the codebase (`/api/boardgames/local` + `/api/boardgames/lookup`)
- this extends that same idea one level further rather than introducing
a new pattern.

**C. Server-side streaming (SSE / chunked transfer) from one endpoint.**
Rejected: IONOS shared hosting behind Apache/mod_php has no guarantee
against response buffering by an intermediate proxy, and this repo has
no precedent for streaming responses. Six independently-cacheable,
independently-testable endpoints is simpler and safer on this hosting
than getting streaming to work reliably.

## Design

### Endpoints

**Search-name resolution, without waiting on `bgg.php`:** the four
name-based endpoints (Amazon/Board Game Quest/H@LL9000/brettspiele-report)
need a name to search under, currently `BggClient::searchNames($bggId,
$primaryName, $germanNames)` = `[$primaryName] + aliasNames($bggId) +
$germanNames`. Of these three, only `$germanNames` (derived from BGG's
live "versions" data) requires the full live lookup - `$primaryName`
is exactly what `bgg_ranks.name` already holds (the same dump-backed
table the existing instant local answer reads), and `aliasNames()` is
already a plain `game_aliases` DB query with no live dependency. Each
name-based endpoint below resolves its own `[$primaryName] +
aliasNames($bggId)` directly from those two tables (mirroring
`BggClient::lookupLocalById()`'s existing pattern) instead of depending
on `bgg.php`'s response - this is what makes true 6-way parallel fire
correct instead of a thundering-herd risk. The live-version-derived
German-title guess is dropped from this first pass; that only affects
games without a curated alias yet, and is a smaller regression than
the one #122 already fixed (curated aliases still work).

- `api/boardgames/bgg.php` - replaces/slims `lookup.php`. Returns name,
  description (+ translation), image, facts (raw numbers, see below),
  categories, mechanics, interaction, BGG's own rating/rank/family
  ranks, good/bad. **The only endpoint that can fail the whole card** -
  same 404/502 behavior `lookup.php` has today.
- `api/boardgames/amazon.php` - rating + price, one fetch serves both
  (unchanged from today's `AmazonRatingClient` behavior).
- `api/boardgames/boardgamequest.php` - How-it-plays text, rating,
  hits/misses (for the good/bad fallback).
- `api/boardgames/hall9000.php` - facts (raw numbers), rating.
- `api/boardgames/brettspielereport.php` - complexity, rating.
- `api/boardgames/brettspielpreise.php` - price.

Each of the five non-`bgg.php` endpoints is Best-Effort exactly as
today: any failure is logged and answered as `{"status":"ok","data":null}`
(HTTP 200), never an error that could break the card. Every endpoint
reuses the exact same client class and `cache_aside()` call that
`lookup.php` uses today - no caching behavior changes, only where the
call is made from.

### Frontend loading model

After the existing instant local answer renders, the frontend fires all
six requests in parallel (`Promise.all`-adjacent, not sequential
`await`s). Each UI section keeps its own small loading state:

- Facts row, categories, description, good/bad: wait on `bgg.php`.
- "Also rated by": each rating source's entry appears independently as
  that source's endpoint resolves - not one atomic list.
- "How it plays": shows as soon as `boardgamequest.php` resolves,
  independent of everything else.
- "Where to buy": each price card appears independently as
  `amazon.php`/`brettspielpreise.php` resolve (mirrors #176's existing
  "show every price found" behavior, just no longer waiting for both).

**good/bad fallback ordering:** waits specifically for `bgg.php` before
deciding whether Board Game Quest's hits/misses are needed as a
fallback (`bgg.php` is almost always the fastest response) - avoids a
visible swap where BGQ's content briefly shows and then gets replaced
once BGG's own comments arrive. The How-it-plays box and BGQ's rating
entry have no such dependency and render the moment `boardgamequest.php`
resolves, regardless of `bgg.php`'s state.

**Facts row (players/duration/age):** BGG's numbers show immediately
once `bgg.php` resolves. H@LL9000 fills in only the individual fields
BGG didn't have (not a wholesale replace) once `hall9000.php` resolves -
if BGG already had `duration`, H@LL9000's `duration` is ignored even if
present.

### Content order (card layout)

Facts row → category tags → description → good/bad → **How it plays**
→ "Also rated by" → "Where to buy". BGG's own content forms one block
at the top; everything sourced from external sites forms a second block
below it, starting with How-it-plays (moved from its current position
between the facts row and the description).

### Facts field cleanup

`players`/`duration`/`age` become plain numbers/ranges with no unit
word, from both BGG and H@LL9000 (`"2 - 4"`, `"75"`, `"8"`, not
`"75 Minuten"` or `"ab 8 Jahren"`). `Hall9000Client::field()`'s regex
extraction needs to strip the label/unit text it currently keeps
verbatim. The frontend appends the correct localized label based on the
existing `lang` toggle state (`"2 - 4 Spieler"` / `"2 - 4 players"`,
`"75 Minuten"` / `"75 minutes"`, `"ab 8 Jahren"` / `"ages 8+"`), fixing
BGG's currently-hardcoded German `duration`/`age` strings and the
frontend's currently-hardcoded English `"players"` in the same pass.

### Also decided, rolled in

Brettspielpreise.de's cache TTL rises from 24h to 7 days (`#180`) -
unrelated mechanically to the endpoint split, but touches the same area
of the codebase and was decided in the same conversation.

## Testing

- One PHPUnit test file per new endpoint verifying it returns the right
  shape for a hit/miss/exception, mirroring the existing
  `RatingSourceTest.php`/`PriceSourceTest.php` pattern - endpoints stay
  thin glue over already-tested client methods, so these tests are
  deliberately small.
- `Hall9000ClientTest` needs new/updated cases for the stripped-unit
  extraction.
- `BoardgameLookupPage.test.tsx` needs the largest rework in this
  change: per-section loading states, the six parallel fetches (mocked
  independently per test), the good/bad-waits-for-bgg ordering, and the
  reordered card layout. Existing tests asserting the old single-endpoint
  shape and the old section order will need updating, not just addition.

## Consequences

- Six endpoint files instead of one is more files to keep in sync
  (shared response shape conventions), but each one is small and
  independently testable - matches this repo's existing per-concern
  endpoint convention (`local.php`, `top.php`, `random.php` are already
  separate files).
- The old `lookup.php` becomes `bgg.php` with a slimmed responsibility;
  anything currently importing/depending on the `/api/boardgames/lookup`
  URL (none found outside `frontend/src/features/boardgames/api.ts`)
  needs updating in the same change.
- No new infrastructure, no new dependency - `curl` (already used via
  `http_client.php`) and plain parallel `fetch()` calls in the frontend
  are sufficient.
