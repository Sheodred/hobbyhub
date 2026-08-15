# ADR-0012: Amazon.de aggregate rating as a second rating source

Date: 2026-08-15
Status: Accepted
Relates to: [ADR-0011](0011-boardgame-lookup-caching.md), [#40](https://github.com/Sheodred/hobbyhub/issues/40)

## Context

The Boardgame Lookup brief asked for "aggregated star ratings from several
review sources". v1 shipped with BoardGameGeek only (ADR-0011), and BGG's
XML API is currently unavailable pending application registration (#40), so
lookups are served from BGG's published ranks dump — a rating and a name,
no description and no player comments.

A second, independent rating was wanted. Amazon was proposed.

## What is taken, and what is not

**Taken:** the aggregate customer rating for the matched product — a star
average (e.g. `4.7`) and the number of ratings behind it (e.g. `257`) —
plus the product title and its URL.

**Not taken:** individual customer reviews. No review text, no titles, no
reviewer names, no dates. Nothing written by a customer is stored or
displayed.

The distinction is deliberate and load-bearing. An aggregate rating is a
fact — a number and a count. Individual reviews are authored expression,
belonging to their writers, and republishing them on this site would be a
redistribution question this project has no need to answer. The feature
needs the number, so it takes only the number.

## Access checks (performed 2026-08-15, before any code was written)

Per the bar this repo already holds itself to (MTGGoldfish: robots.txt
checked and permitted, so a scraper was written; Moxfield: not checked, so
link-out only):

- `https://www.amazon.de/robots.txt`, `User-agent: *` — 417 rules. Neither
  `/s` (search) nor `/dp/` (product detail) is disallowed. Several
  review-specific paths *are* disallowed (`/gp/customer-reviews/...`,
  `/reviews/iframe`, `/review/top-reviewers/`, …); none of them is
  requested by this client, which never touches a reviews page.
- Amazon serves its generic error page to a request carrying no `Accept` or
  `Accept-Language` header at all. Supplying them returns a normal `200`.
  Those are ordinary content negotiation, sent alongside this project's real
  `User-Agent` (`HobbyHub/0.1 (+github…)`) — the client identifies itself
  honestly and does not present itself as a browser. No bot detection is
  circumvented; if Amazon blocks the client, the lookup returns null and the
  feature degrades, rather than escalating to evasion.
- **Open risk, accepted:** Amazon's Conditions of Use prohibit automated
  data gathering irrespective of robots.txt. robots.txt permission is not
  contract permission. This is an accepted, monitored risk on a personal
  non-commercial site taking a single public number per game, at a rate far
  below human browsing — not a resolved question. If Amazon objects, the
  fallback is to drop the panel; nothing else depends on it.

Unlike the PA-API route, this involves no Amazon Associates account, so it
introduces no affiliate relationship and does not affect the non-commercial
answer given during BGG's application registration.

## Decision

`api/lib/AmazonRatingClient.php` reads the aggregate rating from the
amazon.de **search results page** for `<game name> brettspiel`.

- **One request per uncached lookup.** The rating already appears in the
  search result block, so the product page is never fetched.
- **Sponsored results are skipped.** Blocks carrying `AdHolder` are adverts
  for whatever Amazon was paid to display — during development the top
  result for "catan brettspiel" was *Stadt Land Vollpfosten* at 4,7. A
  naive "first `data-asin`" parser would have shown that number as Catan's
  rating. Skipping sponsored blocks is the main reason a parser exists here
  at all rather than a one-line regex.
- **The title must match.** Every significant word (≥3 characters) of the
  game name must appear in the result title, or the block is skipped. No
  match at all → `null`, and no panel is rendered. A missing rating is
  always preferred over a confident wrong one.
- **The matched product title and link are displayed**, so a mismatch is
  visible to the user instead of hiding behind a bare number.
- Cache-aside in `amazon_rating_cache`, 7-day TTL, keyed by lowercased game
  name; throttled to one request per 2 seconds via `amazon_throttle` —
  deliberately slower than the other clients here.
- Failures are never cached (`cache_aside()` skips a null), so a bad day at
  Amazon doesn't pin "no rating" for a week.
- The endpoint treats the whole thing as best-effort: any exception is
  logged and the BGG answer is returned regardless.

## Consequences

- Board game lookups now show two independent ratings on different scales:
  BGG's /10 community average and Amazon's /5 customer average. They are
  labelled separately and never averaged together — combining a hobbyist
  rating pool with a retail one would produce a number meaning nothing.
- **Parsing retail HTML is brittle by nature.** Amazon restyles constantly.
  The parser is written to fail closed: any unmatched pattern yields `null`
  and the panel disappears, rather than rendering a wrong or empty value.
  The rating count is explicitly optional for the same reason.
- Locale is fixed to amazon.de (German result markup, `von 5 Sternen`),
  matching this site's German audience. Another marketplace would need its
  own patterns.
- `http_get_html()` gained an optional `$headers` argument for content
  negotiation. The `User-Agent` is still set by the function itself and
  cannot be overridden by callers — deliberately, so no caller can use it
  to impersonate a browser.
