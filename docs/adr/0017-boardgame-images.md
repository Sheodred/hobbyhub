# ADR-0017: Board game images — no source, no images

Date: 2026-08-17
Status: Accepted, superseded in part by [ADR-0019](0019-bgg-cover-image-hotlink.md)
Superseded in part: the BGG *hotlink* row of the Decision table below. BGG cover
thumbnails are hotlinked in production as of 2026-08-19, as a risk the maintainer
accepted knowingly. **The licensing analysis in this ADR is unchanged and was not
overturned** - ADR-0019 disputes none of it, and the *store* column stays ✗ for
every source. Read ADR-0019 before treating any part of this file as inactive.
Relates to: [ADR-0003](0003-scryfall-proxy.md), [ADR-0005](0005-marketplace-images.md),
[ADR-0009](0009-php-mysql-ionos-migration.md), [ADR-0014](0014-german-rating-sources.md)
Resolves: [#101](https://github.com/Sheodred/hobbyhub/issues/101)

## Context

The Boardgame Lookup renders text only. Several planned features (#102, top 10
games with pictures) want a cover image. Nothing local can supply one: the
ranks dump imported by `api/sql/import_bgg_ranks.php` requires exactly `id`,
`name`, `yearpublished`, `rank`, `average`, `usersrated`, `is_expansion` — no
image column exists to import.

The MTG side has images, which is the trap. `ScryfallClient` carries
`imageUrl`/`artCropUrl` and `EdhrecComboClient` derives thumbnails from
Scryfall's CDN, and that is fine for one specific reason: **Scryfall's
guidelines permit it** (ADR-0003). That permission belongs to Scryfall and
transfers to nobody. The question here is not "can we fetch a URL" — it is
"who has granted us a licence", and those are unrelated questions.

Two distinct acts had to be evaluated separately, because they are different
legally:

- **Hotlinking** — an `<img src>` pointing at someone else's host. We store no
  copy; their server transmits the file. Under German case law this is not
  automatically a reproduction, but it is still a public communication of a
  work we have no rights in, and every candidate's terms forbid it in
  substance anyway.
- **Storing** — a copy of publisher box art on `sheoforge.de` and on IONOS
  disk. That is unambiguously a reproduction (§ 16 UrhG) and needs a licence
  from the rightsholder, who is the publisher, not the site we took it from.

This matters more here than it would in a private repo: the site is publicly
deployed under the maintainer's real name with an Impressum under § 5 TMG.
German rightsholders enforce image use by *Abmahnung*, and the addressee of
one is the person named in the Impressum. "It was only a thumbnail" is not a
defence, and § 51 UrhG (*Zitatrecht*) does not cover decorative cover art
beside a rating.

### What was actually checked, and what was observed

All probes run 2026-08-17 from a residential German IP.

| Target | Probe | Observed |
|---|---|---|
| `boardgamegeek.com/xmlapi2/thing?id=13` | GET, no auth | **HTTP 401**, body `Unauthorized. See https://boardgamegeek.com/using_the_xml_api` |
| `boardgamegeek.com/boardgame/13/catan` | GET, project UA and browser UA | **HTTP 403**, body is a Cloudflare `Just a moment...` interstitial |
| `boardgamegeek.com/terms` | GET | **HTTP 403**, same interstitial — readable only through a real browser |
| `boardgamegeek.com/robots.txt` | GET | 200, `Crawl-delay: 5`, `/boardgame` not disallowed |
| `cf.geekdo-images.com/robots.txt` | GET | 200, `User-agent: *` / `Allow: /` |
| `hall9000.de/html/spiel/azul` | GET | 200, 483 `<img>`, cover at `/html/thumb/220/220/rubriken/spiele/rezensionen/kritiken/azul_cover.jpg` |
| `boardgamequest.com/wp-json/wp/v2/posts?search=…` | GET | 200, posts carry `featured_media` → `wp-content/uploads/…jpg` on their own domain |
| `boardgamequest.com/about/` | GET, project UA | **HTTP 200 with a bot-verification body** — the page never rendered |
| `brettspiele-report.de/wp-json/…` | GET | 200, sampled post had `featured_media: 0` |
| Wikimedia Commons search API | GET, no auth | 200, works fine — see coverage below |

Two entries above are the `AmazonRatingClient` failure mode again, and both
would have been silently mis-read by a naive fetch: BGG's game page answers
**403 with an HTML challenge**, and Board Game Quest's `/about/` answers
**200 with a "verify you're not a bot" body**. A status check alone
classifies the second as success. `docs/agents/pitfalls.md` says to probe
before building; this is what probing found.

### Source-by-source licensing

**BoardGameGeek** — read from `boardgamegeek.com/terms` in a browser, since
the ToS itself is Cloudflare-walled to any client. Three clauses close this
off independently.

> §5.E — "By uploading User Submissions to BoardGameGeek, you hereby grant
> each user of the Geek Websites a non-exclusive license to access your User
> Submissions **through the Geek Websites**, and to use, reproduce,
> distribute, display, and perform such User Submissions **as permitted
> through the functionality of the Geek Websites and under these Terms of
> Service**." (emphasis added)

The licence a BGG user grants us is scoped to BGG's own websites. Displaying
the file on `sheoforge.de` is outside it.

> §6 (preamble) — "BoardGameGeek hereby grants you permission to access and
> make **personal use** of the Geek Websites as set forth in these Terms of
> Service, but not to download or modify the Geek Websites or any portion of
> the Geek Websites except with express written consent"

> §6.E — "You shall not engage in the use, copying, or distribution of any of
> the User Submissions other than expressly permitted herein"

> §6.F — "You shall not frame or utilize any framing techniques to enclose
> any trademark, logo, or other proprietary information (including but not
> limited to images, text, page layout, or forms) of BoardGameGeek without
> express written consent."

§6.F is the hotlink clause in all but name, so **the hotlink/store
distinction does not rescue BGG** — both are refused. §21.D adds
"BoardGameGeek reserves all rights not expressly granted herein."

There is a second, independent barrier that no amount of BGG goodwill would
clear. Cover images on BGG are User Submissions, uploaded by members, and
§5.D grants BGG only a **non-exclusive** licence. BGG cannot sublicense to us
a copyright it does not own. §5.B in fact tells uploaders not to post
material subject to third-party rights at all. So even a hypothetical written
permission from BGG would not be permission from the publisher who owns the
box art.

Worth recording for accuracy, not as a suggestion: §6.B.iv now reads "You
agree not to use the Geek Websites to train or otherwise use as data for an
AI (Artificial Intelligence) or Large Language Model (LLM) system", and §6.D
prohibits commercial use. Neither applies to this site, and neither changes
the outcome.

**Issue #40 (the API's registration requirement) is parked, and its status is
irrelevant to this decision.** The `thing` endpoint's 401 is recorded above
as a fact. Even if the endpoint answered 200 tomorrow, §5.E and §6.F would
still forbid displaying what it returns. This ADR must not be read as an
argument for un-parking #40.

**`cf.geekdo-images.com`** — robots.txt is `Allow: /`, which is a crawl
directive and not a licence; it says nothing about copyright. Immaterial in
any case: with the `thing` endpoint at 401 and the HTML page behind
Cloudflare, there is no id → URL mapping to hotlink *from*.

**H@LL9000** (ADR-0014, already scraped for ratings) — technically the most
convenient source in this whole survey, and legally the worst. Cover art sits
at a fully predictable path derived from the slug the client already computes:
`/html/thumb/220/220/rubriken/spiele/rezensionen/kritiken/<slug>_cover.jpg`.
Their Impressum carries no reuse grant, only `Copyright © 2001 - 2026
H@LL9000`, and under German law silence means all rights reserved — there is
no implied licence to opt into. They are themselves careful about this,
noting that they use BGG data "gemäß den Fair-Use-Richtlinien der
BoardGameGeek XML API". Their robots.txt disallows only `/html/bewerten`,
which is again a crawl rule, not permission to republish. And the image is
publisher box art regardless: H@LL9000 could not license it to us either.

**brettspiele-report.de** — the most explicit refusal found:

> "Das Copyright für veröffentlichte, von brettspiele-report.de selbst
> erstellte Objekte bleibt allein beim Autor der Seiten. Eine
> Vervielfältigung oder Verwendung solcher Grafiken, und Texte in anderen
> elektronischen oder gedruckten Publikationen ist ohne ausdrückliche
> Zustimmung von brettspiele-report.de nicht gestattet. Bei unerlaubter
> Verwendung, Wieder- oder Weitergabe dieser Webseite oder deren Inhalte kann
> der Verantwortliche zivil- und strafrechtlich verfolgt werden."

Moot anyway: the sampled post had `featured_media: 0`, so there is often no
image to take.

**Board Game Quest** — posts do carry a `featured_media` image on their own
domain (verified: `wp-content/uploads/2026/07/Small-World.jpg`). No terms-of-use
or copyright grant was found anywhere on the site; the `/about/` page answers
with a bot-verification wall to a scripted request and the rendered page
contains no licensing statement. Absence of a grant is not a grant. Same
publisher-IP problem underneath.

**Publisher press kits** — the only category where a real, quotable
permission exists. Pegasus Spiele:

> "Wir stellen euch Bildmaterial zur Verfügung! […] Die Verwendung der darin
> enthaltenen Abbildungen ist im Rahmen eurer Medienarbeit honorarfrei. Um
> Zugang zu unserer Mediendatenbank zu erhalten, schreibt uns bitte eine
> Email an presse@pegasus.de. Wir behalten uns das Urheberrecht an den zur
> Verfügung gestellten Bildern vor."

That is genuine and usable — and it is also the shape of the whole category.
Access is gated behind an email and a manual unlock, the grant is bounded by
*Medienarbeit* (editorial coverage), copyright stays with the publisher, and
it covers Pegasus titles only. Stonemaier Games, about as media-friendly a
publisher as exists, has **no** image-licensing statement on its promotion
page at all; Ravensburger's `/presse/` URL redirects to its homepage. There
is no automatable path here: it is one email, one relationship, one licence
scope per publisher, for a catalogue with hundreds of publishers in the top
100 alone.

**Wikimedia Commons** — licensing is the one thing that is *not* a problem
here. Files carry machine-readable licences and the API returns them
unauthenticated (`CC BY-SA 4.0`, `CC0`, `CC BY-SA 3.0` observed), attribution
via `extmetadata.Artist`. Commons discourages hotlinking from
`upload.wikimedia.org` rather than forbidding it, so storing a copy with
attribution is the correct pattern. **Coverage kills it.** Commons will not
host box art, precisely because box art is publisher copyright — what exists
is gameplay photography, and only for famous titles:

| Query | Top Commons hits |
|---|---|
| Catan | `Catan Universe fixed setup.svg`, `Settlers of Catan completed.jpg` |
| Azul | `A four-player game of the board game Azul.jpg` (CC0) |
| Wingspan | `Cards in Wingspan board game.jpg` |
| Brass Birmingham | `The Early History of Brass and the Brass Manufactures of Birmingham.pdf` |
| Ark Nova | `The Nova Scotia minstrel.pdf` |
| Gloomhaven | `Abraxas gem scan.svg` |
| Dune: Imperium | `House of Moritani arms.jpg` |
| Pandemic Legacy | `Playing board game - IMG 20240110 183908.jpg` |

Six of eight are wrong, and they are wrong in the dangerous direction: a
free-text title search over Commons has no key to verify against, so it
returns a confident, correctly-licensed, completely unrelated picture. A top
10 list built this way would ship a 19th-century minstrel songbook next to
Ark Nova. ADR-0005's Commons precedent was hand-picked seed data for a
handful of marketplace rows, which is a different thing from an automated
per-game lookup.

## Decision

**Board games get no images. Nothing is built.**

No candidate source grants a licence to display board game cover art on this
domain, by hotlink or by copy:

| Source | Hotlink | Store | Blocking reason |
|---|---|---|---|
| BGG `thing` / geekdo CDN | ✗ | ✗ | ToS §5.E scopes the licence to BGG's sites; §6.F forbids framing; §6.E forbids copying. Also 401 today (#40) |
| H@LL9000 | ✗ | ✗ | No grant, `Copyright © 2001 - 2026`; underlying box art is publisher IP |
| brettspiele-report | ✗ | ✗ | Explicitly prohibits reuse without written consent |
| Board Game Quest | ✗ | ✗ | No grant found anywhere on the site |
| Publisher press kits | ✓ | ✓ | Legally clean, but per-publisher, email-gated, manual, not automatable |
| Wikimedia Commons | (✓) | ✓ | Licence fine, coverage ~0 for box art and matching is unverifiable |

#102 ships without images, as that issue already allows.

**One image is out of scope of this decision: the "Powered by BGG" logo**
(`frontend/public/powered-by-bgg.svg`, added 2026-08-17 with #40). This ADR is
about *game cover art*, whose rights sit with publishers and which no source
licenses to us. The attribution logo is the opposite case — BGG's XML API terms
*require* a public-facing app to display it, linking back to BoardGameGeek, and
publish the official files for that purpose. "No images" therefore never meant
"no BGG logo": showing it is a condition of using the API at all.

If a picture is ever genuinely wanted for a specific game, two paths stay
open and neither needs code: photograph a copy the maintainer owns, or email
one publisher for press-kit access under terms like the Pegasus wording
above. Both are a manual, per-game act of adding a file — not a client, not a
cache, not a pipeline.

## Consequences

- Nothing to build, nothing to host, nothing to keep fresh. This is the
  cheapest possible outcome and it happens to also be the correct one.
- **No `*_image_cache` table, and therefore no `docs/deploy-checklist.md`
  entry.** The cache-clearing rule from `pitfalls.md` would have applied if a
  client had been written; none was, so there is no release step. If this
  decision is ever revisited, that checklist line is a hard requirement of
  the revisit, not an afterthought.
- The Boardgame Lookup and #102 stay text-first. Rank, name, year, and four
  ratings on four scales are already the substance of the page; typography and
  layout carry it. Nobody visits a rating aggregator for the pictures.
- Distinct from ADR-0005, and deliberately so. There the images were
  user-supplied, and the only question was where the bytes lived — an
  infrastructure decision, resolved on hobby-project grounds. Here the
  images are third-party IP and the question is whether we may display them
  at all. A hobby project has exactly the same copyright obligations as a
  commercial one; the "it's only a hobby site" argument that carried ADR-0005
  does not carry this one, and arguably cuts the other way given the
  Impressum names a private individual.
- IONOS disk (ADR-0009) is spared, but that is a side effect, not the reason.
  If disk were free the answer would be identical.
- **This is a legal reading by a non-lawyer, of terms as they read on
  2026-08-17.** It is conservative on purpose: the downside of shipping no
  images is a plainer page, and the downside of shipping the wrong ones is
  addressed to a named person at a real postal address.
- Terms change. If images are ever revisited, re-read the ToS live rather
  than trusting this ADR — the same rule `pitfalls.md` states for API access
  facts applies to licence text, and BGG in particular has amended §6.B
  within the last few years.
