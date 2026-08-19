# ADR-0019: BGG cover images are hotlinked, as an accepted risk

- **Status:** Accepted
- **Date:** 2026-08-19
- **Supersedes in part:** [ADR-0017](./0017-boardgame-images.md)
- **Relates to:** [ADR-0011](./0011-boardgame-lookup-caching.md),
  [ADR-0003](./0003-scryfall-proxy.md)
- **Implements:** [#135](https://github.com/Sheodred/hobbyhub/issues/135) (PR #164)

## Context

ADR-0017 decided "Board games get no images. Nothing is built." PR #164 shipped
BGG cover thumbnails to production anyway, hotlinked from `cf.geekdo-images.com`,
before anyone noticed the ADR existed. This ADR records what was decided once it
was noticed. It exists so the record matches production, not to argue that
ADR-0017 was wrong.

**The licensing analysis in ADR-0017 is unchanged and still stands.** Nothing in
BGG's terms was re-read, re-interpreted, or found to have changed. Specifically,
all of this remains true and is not disputed here:

- **§6.F** forbids framing BGG images. ADR-0017 calls it "the hotlink clause in
  all but name", and that reading is not contested — the hotlink/store
  distinction does **not** rescue BGG. Both are refused by the terms.
- **§5.E** scopes the licence a BGG user grants to access "through the Geek
  Websites". Displaying the file on `sheoforge.de` is outside that scope.
- Cover art is a **User Submission**. BGG holds a non-exclusive licence and
  cannot sublicense publisher box art to anyone, so even BGG's written
  permission would not be the publisher's permission.
- The site is deployed under the maintainer's real name with an Impressum under
  § 5 TMG, and German rightsholders enforce image use by *Abmahnung* addressed to
  the person named there. § 51 UrhG (*Zitatrecht*) does not cover decorative
  cover art beside a rating.

One factual premise of ADR-0017 *has* changed, and it is worth recording
precisely because it changes nothing legally: ADR-0017 noted the `thing`
endpoint returned **401** and concluded there was "no id → URL mapping to
hotlink *from*". Since #40, a `BGG_API_TOKEN` is configured and `thing` answers
200 with `<thumbnail>` and `<image>` populated. So the *practical* barrier is
gone. ADR-0017 anticipated exactly this and pre-empted it:

> "Even if the endpoint answered 200 tomorrow, §5.E and §6.F would still forbid
> displaying what it returns."

That sentence is correct and this ADR does not overturn it.

## Decision

**Cover thumbnails stay, hotlinked from `cf.geekdo-images.com`, as a risk the
maintainer has accepted knowingly.**

This is a risk-acceptance decision, not a legal one. It was made by the
maintainer on 2026-08-19 after being shown the ADR-0017 analysis above in full,
and after being offered a revert as the recommended option. The grounds are the
maintainer's own judgement about the exposure on their own site; no new legal
basis is claimed, and none should be inferred from this file.

What is in scope:

- **Hotlink only.** `<img src>` pointing at BGG's CDN. The URL is cached in
  `bgg_lookup_cache` with the rest of the mapped payload; the bytes are never
  copied to IONOS. Storing copies would be an unambiguous reproduction (§ 16
  UrhG) and remains refused — ADR-0017's store column stays **✗**, and this ADR
  does not weaken it.
- **`<thumbnail>` only** on the result card (~200×150, 5 KB). `<image>` (the
  ~2 MB original) is carried in the API payload but not displayed.
- **BGG only.** H@LL9000, brettspiele-report and Board Game Quest stay refused
  for images, on ADR-0017's reasoning, which is untouched.

## Consequences

- Production matches a written decision again. That is the point of this file:
  an undocumented deviation is worse than a documented one, because the next
  person to read ADR-0017 would otherwise find code contradicting it and no
  record of why.
- **The exposure is real and is the maintainer's.** An *Abmahnung* would be
  addressed to the person in the Impressum. This ADR does not reduce that
  exposure; it records that it was accepted with the analysis in view.
- **Reversal is cheap and should be immediate if ever contacted.** Removing the
  images is a two-line revert of the render site — the placeholder path already
  exists and is tested (`keeps a fixed-size placeholder when the game has no
  cover`). No table to drop, no cache to clear, nothing to migrate. If any
  rightsholder, publisher, or BGG makes contact, revert first and discuss
  after.
- **No `*_image_cache` table**, so ADR-0017's hard requirement about a
  `docs/deploy-checklist.md` entry on revisit does not trigger. That requirement
  was scoped to a *stored* image cache; nothing is stored. If storing is ever
  reconsidered, that checklist line becomes mandatory again.
- The Privacy Policy already discloses that covers load directly from
  `cf.geekdo-images.com` (and MTG card images from `cards.scryfall.io`), so
  visitors' IPs reaching a third party is covered. That is a GDPR disclosure and
  is unrelated to the copyright question above — neither cures the other.
- **This remains a non-lawyer's record of a non-lawyer's decision.** ADR-0017's
  closing caveat applies unchanged. If this is ever worth real money or real
  traffic, it is worth an actual legal opinion.

## What would change this back

Any one of: contact from BGG or a publisher; BGG adding technical hotlink
protection (they currently serve the CDN with and without a `Referer`, verified
2026-08-19); the maintainer reconsidering. The first should not wait for a
discussion.
