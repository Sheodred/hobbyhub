# ADR-0020: brettspielpreise.de as a second, wider retail price source

- **Status:** Proposed
- **Date:** 2026-08-20
- **Relates to:** [ADR-0018](./0018-boardgame-pricing.md), [ADR-0011](./0011-boardgame-lookup-caching.md)
- **Implements:** [#172](https://github.com/Sheodred/hobbyhub/issues/172)

## Context

ADR-0018 shipped a single retail price, extracted from amazon.de's search
results page (`AmazonRatingClient::priceFor()`). In production this is
frequently `null` for well-known games: live-checked 2026-08-19 against the
BGG top-10, 5 of 10 (Dune: Imperium, Dune: Imperium - Uprising, Twilight
Imperium: Fourth Edition, War of the Ring: Second Edition, Pandemic Legacy:
Season 1) returned no price at all. The immediate cause (production's shared
`http_get_result()` never decompressing a gzip-encoded amazon.de response) is
a separate bug, tracked and fixed independently of this ADR. But the deeper
limitation is structural even once that bug is fixed: **one store, one
title-matching heuristic, one point of failure.** A single scrape target will
keep going stale, keep getting anti-bot-blocked, and will never answer "where
is this cheapest" - only "what does amazon.de show today, if it answers at
all".

This ADR surveys wider options for a second, or replacement, retail price
source - live-probed 2026-08-20, the same evidence bar as ADR-0018.

| Source | Result |
|---|---|
| **brettspielpreise.de `/api/info`** | **Open door.** Public, keyless, documented API. See Decision. |
| geekmarkt.de | `robots.txt` fully open (`Allow: /`, no per-bot exclusions, explicit `llms.txt` permitting non-training use) - but the site itself is an empty client-rendered shell today (114-byte homepage, one-URL sitemap). Nothing to fetch. Confirms ADR-0018's characterisation ("open door on paper... never probed to a working endpoint") is still accurate; there is still no working endpoint. |
| BGG's own marketplace (`/market/...`, `/geekmarket/...`) | 403 on a scripted fetch, same shape as the browse-page 403s already documented for family/strategy/thematic rankings. Not a path this project has permission to read from. |
| BGG XML API2 `thing?pricehistory=1` | A real, documented parameter - but it returns historical **marketplace** (peer-to-peer, used) trade prices from BGG's own trading system, not a current retail price. Noisy, not what a "buy it now" price tag needs. Not pursued here; could matter for a future used-market feature. |
| fantasywelt.de, spiele-offensive.de, gameware.at | All three run Cloudflare's Content-Signal `robots.txt`, which grants the generic `User-agent: *` `search=yes` (arguably covering this use) but **explicitly disallows `ClaudeBot` by name** alongside Amazonbot, GPTBot, CCBot, Google-Extended and others. Treated as a closed door: an explicit AI-bot opt-out is not a technicality to route around by requesting under a different identity. No content was fetched from these beyond `robots.txt` itself. |
| brettspielversand.de | `/suche.php` (its search) is `Disallow`'d. No way to resolve a game name to a product URL without it. |
| geizhals.de | `Disallow: /games/` - the entire board-game category is blocked outright. |
| idealo.de | Already closed (#103, "not planned"): 403 on the robots.txt request itself. Unchanged. |

## Decision

**Add `brettspielpreise.de`'s public API as a price source**, queried by BGG
ID (the project already has one for every game), alongside or in place of the
amazon.de scrape.

- **Endpoint:** `GET https://brettspielpreise.de/api/info?eid={bggId}&currency=EUR&destination=DE&locale=de&sitename=sheoforge.de`
  (also has `/api/search` for free-text lookups, unused here since every call
  site already has a BGG id).
- **No key, no registration.** `sitename` is a self-identifying URL, not a
  secret.
- **Terms, quoted from the API's own docs page (`/api/plugin`):** "Feel free
  use the API for your own project, as long as you link back to this site
  when the information is presented, and be sure to cache obtained
  information for at least one hour." Two conditions:
  1. **Backlink.** Every returned item and offer carries its own `url`/`link`
     to brettspielpreise.de (or straight to the store, routed through their
     redirect). The "Where to buy" panel must keep that link, not replace it
     with a bare price.
  2. **Cache at least one hour.** This project's `cache_aside()` pattern
     already defaults every rating/price source to TTLs measured in days
     (ADR-0011); trivially satisfied.
- **Live-tested 2026-08-20 against exactly the games amazon.de fails on**
  (Dune: Imperium, `eid=316554`; Twilight Imperium 4e, `eid=233078`): both
  returned real, current, multi-store offers (price, shipping, stock,
  country, per-offer link), sorted cheapest-in-stock-first (`sort=SMART`).
  Ark Nova (`eid=342942`) returned 12+ offers across DE/DK/BE/NL/HR/LT/LV,
  cheapest €55.17 DE with free shipping and in stock.
- **Provenance:** the same platform (confirmed via its own `robots.txt`
  pointing at a shared sitemap) also runs `boardgameprices.co.uk` and
  `meeple.dk` - an established, years-old service (`© 2012-2026`
  copyright notice on the page), not a scrape target of unknown durability.

**What this is not:** not a used-market source. The offers returned are
retail listings from partner shops, the same category as amazon.de's price,
not eBay/Kleinanzeigen-style peer-to-peer secondhand listings. ADR-0018's
reasoning and decision on used-market pricing (link-out only, never fetched)
is untouched by this ADR.

## Consequences

- `game['price']` gains a real second source, and - because the API returns
  every matching offer, not one - the option to show "cheapest of N stores"
  rather than "whatever amazon.de happened to have," which is closer to what
  #90 originally asked for than ADR-0018's single-store answer was.
- No new dependency, no new vendor account, no cost, no affiliate
  relationship - same shape as ADR-0018's own "no new dependency" consequence.
- A new client (`BrettspielpreiseClient` or similar) parses JSON, not scraped
  HTML - removes the title-matching heuristic and the gzip/anti-bot fragility
  that amazon.de scraping carries by construction. Structurally more robust,
  independent of whether the gzip bug is fixed.
- Whether this **replaces** `AmazonRatingClient::priceFor()` outright, runs
  **alongside** it as a fallback, or the two are merged into one multi-store
  list is an implementation decision for whoever picks this up - this ADR
  only establishes that the source is permitted and works, not the exact
  call-site shape.
- The required backlink means the frontend's "Where to buy" panel needs a
  brettspielpreise.de-attributed link somewhere in the price block, not just
  a bare number - a small, permanent UI constraint, not a one-time cost.
