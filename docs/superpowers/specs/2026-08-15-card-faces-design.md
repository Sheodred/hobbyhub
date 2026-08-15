# Card faces: split halves, flippable double-faced cards

- **Date:** 2026-08-15
- **Relates to:** #34, [ADR-0016](../../adr/0016-combos-via-edhrec.md)

## Problem

Three separate symptoms, one shared cause — the API flattens a multi-faced
card down to one face and the frontend has nothing else to render.

1. **Double-faced cards show only their front face.** No name, cost, type line
   or text for Insectile Aberration; no way to see it at all.
2. **Split and adventure cards show only half their text.** `Fire // Ice`
   renders Fire's ability; Ice's is dropped.
3. **Every multi-faced card is silently comboless.** `EdhrecComboClient` slugs
   the whole `A // B` name, so
   `Birgi, God of Storytelling // Harnfel, Horn of Bounty` becomes
   `birgi-god-of-storytelling-harnfel-horn-of-bounty` → 403 → "no combos",
   while EDHREC lists 100 under `birgi-god-of-storytelling`. Verified against
   production.

## Upstream facts this design is built on

Verified live, not assumed:

| Layout | Faces | Top-level `image_uris` | Physically |
|---|---|---|---|
| `transform` (Delver of Secrets) | 2 | absent | two sides |
| `modal_dfc` (Malakir Rebirth) | 2 | absent | two sides |
| `split` (Fire // Ice) | 2 | present | one side |
| `adventure` (Bonecrusher Giant) | 2 | present | one side |
| `normal` (Lightning Bolt) | 0 | present | one side |

**EDHREC indexes combos under the front face name only.** Back faces have no
page at all: `harnfel-horn-of-bounty`, `jace-telepath-unbound` and
`awaken-the-blood-avatar` all 403, while their front faces return 100 combos
each. There is no full-name page either. Combos therefore belong to the card,
not to the face.

## Decision

### API

`ScryfallClient::mapCard()` gains two fields:

- `layout` — Scryfall's own value, passed through untouched.
- `faces` — for each entry of `card_faces`: `name`, `manaCost`, `typeLine`,
  `oracleText`, `imageUrl` (from that face's own `image_uris` where it has
  one). `null` when the card has no `card_faces`.

Existing top-level fields keep their current meaning and their front-face
fallbacks, so nothing that reads them today changes behaviour.

`EdhrecComboClient::slug()` takes the text before `//` before slugging.

### Frontend

`MtgCardDetailPage` branches on `layout`:

- `transform`, `modal_dfc` → a flip control on the image. The selected face
  drives image, mana cost, type line and oracle text. Local `useState`, no
  route change and no request: every face is already in the same response.
- `split`, `adventure` → both faces' name, cost and text stacked below the one
  shared image. No flip control; it is one physical card.
- anything else → unchanged.

`ComboPanel` stays mounted with the card's full name and **does not refetch on
flip** — the slug fix routes it to the front face, which is the only page
EDHREC has. A back face showing its own (always empty) combo list would read
as a bug.

## Testing

- **PHP:** `mapCard` exposes `layout` and per-face values for a `transform`
  fixture and a `split` fixture, and `faces` is null for a normal card; the
  combo slug drops the `// back half`.
- **Frontend:** flipping swaps the rendered text; a `split` card shows both
  halves and no flip control; a `normal` card shows no flip control.

## Out of scope

The `colors` field is empty for double-faced cards for the same reason the
mana cost was, but nothing renders it — left alone deliberately.
