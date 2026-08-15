# ADR-0014: German rating sources (H@LL9000, brettspiele-report)

Date: 2026-08-15
Status: Accepted
Relates to: [ADR-0012](0012-amazon-aggregate-rating.md), [ADR-0013](0013-board-game-quest-review.md)

## Context

Amazon (ADR-0012) and Board Game Quest (ADR-0013) are a retail rating and an
English-language reviewer. This site is German-hosted with a German audience,
so German rating sources were surveyed.

Six candidates were checked for robots.txt permission and a machine-readable
interface before any code was written:

| Site | robots.txt | Interface | Outcome |
|---|---|---|---|
| hall9000.de | 1 rule (`/html/bewerten`) | RSS feeds + slug URLs | **Adopted** |
| brettspiele-report.de | 2 rules, no content blocked | WordPress REST API | **Adopted** |
| reich-der-spiele.de | 12 rules, no content blocked | WordPress REST API | Rejected — search returned nothing for test games and no rating in the post body |
| spielen.de | `*` blocks `/games/`, `/login`, … | none | Rejected — no structured interface |
| spieletest.at | permissive | none | Rejected — Austrian, HTML only |
| ludoversum.de | unreachable | — | Rejected |

## Decision

### H@LL9000 (`api/lib/Hall9000Client.php`)

Game pages live at a **predictable slug**: `/html/spiel/<slug>`, lowercase
with every run of non-alphanumerics collapsed to `_` (the same form their own
RSS feeds emit: `das_orakel_von_delphi`). There is therefore **no search
step**, and none of the wrong-product risk that forced defensive matching on
the other two sources — a slug either exists or 404s.

Takes the aggregate rating, its rating count, and the player-count and
duration fields, which no other source here provides.

**Scale: 1–6, 6 best.** Their `Bewertungsmaßstab` page states no
machine-readable maximum, so it was established empirically from their own
ranking page: the top entry is `6,0` and the rest cluster `5,2`–`5,9`. A
parsed value above 6 is treated as a mis-parse and discarded rather than
displayed.

### brettspiele-report (`api/lib/BrettspieleReportClient.php`)

Public WordPress REST API. Their reviews end with a block of category scores
followed by a single `Bewertung: <n>` line — the overall verdict, which is
the **last** such match in the body. Only that number is taken: the
categories above it (Anspruch, Gedächtnis, Komplexität, Zufall) are
*descriptors*, not quality marks, and averaging them would invent a number
the site never published.

**Scale: /20, inferred.** Not stated on the page. 25 sampled reviews score
8–18 overall, with category values reaching 19 and nothing above 20.
Recorded here as an inference, not a fact.

Title matching is exact, as in ADR-0013: `Azul – Der Sommerpavillon` and
`Die Siedler von Catan – Aufbruch der Händler` are different games from Azul
and Catan, and their scores must never appear as those games'.

## Response shape change

Four external ratings on four different scales made four bespoke response
fields untenable. `amazon` was replaced by a single `ratings` array, each
entry carrying `source`, `value`, `max`, `count`, `title` and `url`.

**The `max` travels with every value and is always rendered.** A `15/20`
shown beside a `4.8/5` without its scale reads as catastrophically worse
rather than slightly better. Ratings are never averaged across sources: a
mean over a retail pool, one reviewer and two German sites would be a number
nobody published.

The endpoint wraps every optional source in `optional_source()`, so one that
is slow, broken or simply has no entry for a game can neither cost the user
their BGG answer nor take the other sources down with it.

## Consequences

- Verified live: Azul → BGG 7.7/10, Amazon 4.8/5, H@LL9000 4.8/6, with
  players `2 - 4` and duration `30 - 45 Minuten`. Wingspan → H@LL9000 4.6/6.
  Intarsia → H@LL9000 3.5/6 plus Board Game Quest 3.5/5.
- **Coverage per source is partial and that is intended.** H@LL9000 has no
  page for the `catan` slug (their Catan entries use the full German title);
  brettspiele-report has no review of base Azul, Wingspan, Catan or Intarsia,
  only spin-offs. Each missing source simply omits its entry.
- H@LL9000 is the most robust integration in this feature: no search, no
  sponsored results, no title disambiguation. If one source survives a
  redesign elsewhere, it will be this one.
- Both scales are inferences from observed data rather than published
  constants. If either site changes its range, the displayed denominator
  becomes wrong — the rating bound check on H@LL9000 catches the worst case,
  brettspiele-report has no equivalent signal.
