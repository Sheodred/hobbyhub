# ADR-0018: Boardgame pricing — amazon.de retail price extracted, used-market is a link-out

Date: 2026-08-18
Status: Accepted
Relates to: [ADR-0012](0012-amazon-aggregate-rating.md), [ADR-0011](0011-boardgame-lookup-caching.md)
Resolves: [#90](https://github.com/Sheodred/hobbyhub/issues/90)

## Context

#90 asked for a price panel on the Boardgame Lookup result: what a game
costs, new and used. Its own source-by-source survey (recorded on the issue,
live-probed 2026-08-17) ruled almost everything out:

| Source | Result |
|---|---|
| eBay.de Browse/Finding APIs, unauthenticated | 403 / 418 |
| eBay.de robots.txt | disallows `/sch/` (search), explicit anti-scraping banner |
| Kleinanzeigen.de Nutzungsbedingungen | names "Crawler, Spider, Scraper" as requiring written consent |
| amazon.de `/gp/offer-listing` (used offers) | robots.txt-disallowed |
| idealo.de | 403 on robots.txt itself, anti-bot interstitial (#103, closed not-planned) |
| geekmarkt.de | the one open door on paper, but its real listings are client-rendered - never probed to a working endpoint |

**amazon.de's `/s` search path is the one already-cleared exception** (ADR-0012):
robots.txt permits it, and `AmazonRatingClient` already fetches it on every
uncached rating lookup.

## Decision

**Retail (new) price: extracted from amazon.de, same request as the rating.**
`AmazonRatingClient::parseSearchHtml()` now returns every title-matching,
non-sponsored candidate on the page with whatever it carries - a rating, a
price, or both, since a brand-new listing can have a price with no reviews
yet and must not be dropped for lacking one. `ratingFor()` and `priceFor()`
each walk the same list looking for the field they need, so no rating
behaviour changed and no second request is made. The result is a plain
retail price - not the cheapest available and not the used market. Only the
real selling price is taken (`data-a-color="base"`), never the struck-through
UVP list price that shares its markup shape (`data-a-color="secondary"`).

**Used-market (secondhand) price: a link-out, not a fetch.** Neither eBay.de
nor Kleinanzeigen.de is a source this project reads from - the ToS/robots.txt
findings above are unambiguous, and scraping past an explicit "no crawlers"
clause is not something this project does regardless of technical
feasibility (the same bar ADR-0012 already holds itself to). A plain search
URL for the resolved game name needs no permission and costs nothing - the
same shape as the existing Moxfield link-out (no public API, so link out
instead of building one).

## What this means #90's "cheapest listing" and #104's "average of lowest 5"
never happened

Both assumed a real listing feed to compute over. None exists today. If eBay's
Developer Program is ever registered for (an OAuth app token, the same shape
of step #40 needed for BGG), a genuine used-market panel becomes possible and
#104's methodology (average of the lowest 5, never the single cheapest - a
single listing is usually a promo card or a mispriced outlier, not the game)
is still the right one to build it with. Kleinanzeigen is not a phase at all
under any technical route - its ToS names crawling by name.

## Consequences

- One new field on the lookup response: `price: {value, currency, source,
  url} | null`. Absent (`null`) exactly when amazon.de has no title-matching
  listing with a visible price for any of the tried names (English primary,
  then the German candidates from #122).
- `amazon_rating_cache` changed shape (a list of candidates, not one winner)
  to let `ratingFor()`/`priceFor()` share a single fetch. A cached row
  written before this change breaks the new reader with a `TypeError`, not a
  graceful miss - `api/sql/2026_amazon_price_cache_reset.sql` clears the
  table once on deploy. Local dev picks this up for free on the next
  `php` container rebuild only if the row had already expired.
- No new dependency, no new vendor account, no affiliate relationship.
