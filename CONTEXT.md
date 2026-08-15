# HobbyHub

A personal hobby site: board game lookups, Magic: The Gathering browsing, chess, and a home page of local and hobby news. Everything it shows is published by someone else — the site's own domain is about *how other people's data is named, combined and presented here*.

Terms below were extracted from ADR-0011 – ADR-0014 and from the code on 2026-08-15; where a term was settled by a decision, the ADR is named. If a term here disagrees with the code, the code is wrong or the term has drifted — say so rather than quietly using both.

## Language

### Board games

**Game**:
A board game as BoardGameGeek defines it, identified by its BGG id.
_Avoid_: title, product, boardgame (one word)

**Lookup**:
A single answer about one Game — its BGG facts plus every Rating Source that had something to say about it.
_Avoid_: search result, query, fetch

**Disambiguation**:
The answer given when a name matches several Games: a list of candidates instead of a Lookup. Distinct from "not found".
_Avoid_: ambiguous match, multiple results

**Rating Source**:
A site that publishes its own score for a Game, on its own scale (ADR-0012 – ADR-0014). Each keeps its own maximum and is labelled by name; scores from different Rating Sources are never averaged, because a mean across a retail pool, a reviewer and two German review sites is a number nobody published.
_Avoid_: review provider, rating API, score service

### Magic: The Gathering

**Card**:
A Magic card as Scryfall defines it, identified by its Scryfall id.

**Printing**:
One set's release of a Card. A Card name has many Printings; each is its own Card id.
_Avoid_: version, edition, variant

**Face**:
One side or half of a Card that has more than one — the two sides of a transform/modal card, or the two halves of a split/adventure card. A Card always has exactly one name, cost and combo lookup no matter how many Faces it has; only the rendering differs (flip versus stacked).
_Avoid_: side, half, mode

**Combo**:
Two or more Cards that produce a stated result together, as published by Commander Spellbook and served through EDHREC (ADR-0016). Belongs to the Card, never to a Face — EDHREC indexes only front faces.
_Avoid_: interaction, synergy

**Archetype**:
A named deck family in a format's metagame, as MTGGoldfish groups them — "Boros Energy", "4c Control". Identified by its MTGGoldfish path.
_Avoid_: deck type, strategy, archetype family

**Deck**:
One player's tournament decklist for an Archetype, split into Mainboard and Sideboard.
_Avoid_: list, build

**Meta Entry**:
A single ranked line on the Best of Meta & Stats page — a most-played Card or a strongest Archetype, with its rank and deck count.
_Avoid_: stat, ranking, trend

### Home

**Panel**:
One self-contained card on the home page — weather, music, a news feed, flea markets. Each Panel fails on its own without taking the page down.
_Avoid_: widget, tile, card (Card means the Magic kind)

**Flea Market**:
A dated children's flea market in or near Dortmund, with a venue and, where known, coordinates.
_Avoid_: event, market, Flohmarkt (in code and English prose)

### Sourcing

**Best-Effort**:
The status of any source that is not the answer the user asked for. A Best-Effort source that is slow, broken or simply has no entry must never cost the user the main answer and must never take the other sources down with it (ADR-0011).
_Avoid_: optional, non-critical, nice-to-have

**Cache**:
A stored copy of a third-party answer that expires on its own and refills on demand (ADR-0011). Distinct from a Snapshot.
_Avoid_: store, buffer

**Snapshot**:
Third-party data imported deliberately by a person and held until the next import — the BGG ranks dump, the imported Decks. It has no expiry, and nothing refills it automatically.
_Avoid_: dump, sync, mirror
