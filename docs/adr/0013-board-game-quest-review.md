# ADR-0013: Board Game Quest as a review source

Date: 2026-08-15
Status: Accepted
Relates to: [ADR-0011](0011-boardgame-lookup-caching.md), [ADR-0012](0012-amazon-aggregate-rating.md), [#40](https://github.com/Sheodred/hobbyhub/issues/40)

## Context

Two gaps remained in Boardgame Lookup. BGG's ranks dump carries no
description and no player comments, so while #40 is open a lookup shows a
rating and nothing else. And ADR-0012's Amazon rating is a number without an
opinion behind it.

Board Game Quest publishes structured written reviews with a score, a
"Gameplay Overview" explaining how the game plays, and explicit Hits/Misses
bullet lists — the shape this feature has wanted from the start.

## Access checks (performed 2026-08-15, before any code was written)

- `https://www.boardgamequest.com/robots.txt` disallows only `/wp-admin/`
  (with `Allow: /wp-admin/admin-ajax.php`) and publishes two sitemaps. No
  content path is disallowed. Same bar MTGGoldfish passed in this repo.
- The site exposes the standard **WordPress REST API** at
  `/wp-json/wp/v2/posts`, which answered `200` to a plain request carrying
  this project's real User-Agent. Using a public JSON API is preferred over
  parsing rendered pages: structured fields, no markup guessing, and no
  ambiguity about what is being requested.

## What is taken

Per matched review: the score, a truncated "how it plays" blurb
(`RULES_MAX_LENGTH`, 320 characters, ellipsised), the Hits and Misses
bullets — short phrases they write as their own summary — the review title,
and its URL.

Every rendering links back to the full review, and the panel is labelled
with their name. This site excerpts and points at their work; it does not
mirror it. If Board Game Quest would rather not appear here at all, the
client is one file and the panel one component.

## Decision

`api/lib/BoardGameQuestClient.php`, cache-aside in `bgq_review_cache` with a
14-day TTL (a published review does not change), throttled to one request
per second via `bgq_throttle`, failures never cached, and wired into the
endpoint as best-effort so it can never cost the user their BGG answer.

**Matching is deliberately strict.** A candidate post's title, with a
trailing "Review" removed, must *equal* the game name — not merely contain
it. This was not the first attempt: a contains-match returned
*Wingspan Pocket Review* for "Wingspan" and would have returned
*Azul Duel Review* for "Azul". Both are reviews of different products, and
presenting either as the game's verdict would be a wrong answer wearing a
real citation — the most damaging kind, because the link makes it look
verified.

A post also only counts as a review if its body contains a `Final Score`
line. Their round-ups ("Top 10 Board Games Paul and I Disagree On", "The
Best Board Games of 2025") match search terms and name many games while
reviewing none.

## Consequences

- **Coverage is partial, by design.** Board Game Quest reviews mostly recent
  and mid-size releases; they have no review of base Catan, Azul, or
  Wingspan. Those lookups show no panel at all. Verified live: Intarsia
  3.5/5 and Harmonies 4/5 resolve, Wingspan and Azul correctly resolve to
  nothing. Missing beats wrong.
- While #40 is open, their Hits/Misses fill the good/bad slots that BGG's
  comments would otherwise provide, and their Gameplay Overview stands in
  for BGG's missing description. Both defer to BGG's own content once the
  API is reachable again — the endpoint only fills what is still null.
- A lookup can now show three ratings on three scales: BGG /10, Amazon /5,
  Board Game Quest /5. They are labelled by source and never combined; an
  average across a hobbyist pool, a retail pool, and one reviewer would mean
  nothing.
- Parsing prose section headers ("Gameplay Overview:", "Hits:", "Misses:")
  is brittle if they restyle their posts. Every parse failure yields an
  empty string or empty list rather than a broken panel, and the score is
  the only required field.
