# Architecture review — 2026-08-15

Deepening candidates found by scoping to the hot spots of the last 60 commits:
`api/sql/schema.sql`, the rating clients, `api/boardgames/lookup.php`,
`api/health.php`, the home panels. Vocabulary is `CONTEXT.md` for the domain
and the deep-module glossary (module, interface, depth, seam, adapter,
leverage, locality) for the architecture.

Nothing here is decided. These are candidates; a chosen one becomes an ADR.

## 1. Four Rating Source adapters, no interface — **strong**

**Files:** `api/boardgames/lookup.php`, `AmazonRatingClient`,
`BoardGameQuestClient`, `Hall9000Client`, `BrettspieleReportClient`

**Problem.** Four adapters already fill the Rating Source role, and no
interface names it. Each returns its own array shape (`rating` or `score`,
`max` present or implied, `title` sometimes), so `lookup.php` holds a 34-line
literal flattening all four into one `ratings` list. The seam is real — four
adapters prove it — but it sits inside an endpoint, reachable only over HTTP.
Adding a fifth Rating Source touches six places: the adapter, two tables in
`schema.sql`, `config.php`, the mapping in `lookup.php`, and the readiness
list in `health.php`.

**Solution.** `RatingSource::ratingFor(string $gameName): ?Rating`, where
`Rating` carries label, value, max, count, title, url. Each client becomes an
adapter. `lookup.php` iterates a list instead of mapping.

**Wins.** Locality: the shape of a rating lives in one module, not in an
endpoint. Leverage: one interface, four adapters today. The interface becomes
the test surface — the flattening is testable without HTTP. Best-Effort
failure moves behind the seam instead of being re-declared per source.

## 2. The same throttle, implemented six times — **strong**

**Files:** `ScryfallClient`, `BggClient`, `AmazonRatingClient`,
`BoardGameQuestClient`, `Hall9000Client`, `BrettspieleReportClient`,
`api/sql/schema.sql`

> **Contradicts ADR-0011**, which chose a single-row throttle table per
> source, mirroring `ScryfallClient`. Worth reopening: that decision was
> recorded when the pattern had two instances and was about caching policy,
> not about copying sixteen lines of code. The policy survives the change —
> per-source intervals stay as constants on each client.

**Problem.** Six `private function throttle()` implementations, byte-identical
apart from the table name, served by six two-column tables. The wait
computation — read, compare, `usleep`, upsert — is private to each client, so
no test reaches it. Deletion test: deleting the six copies concentrates
complexity in one module rather than moving it.

**Solution.** One module: `throttle(string $source, int $minIntervalMs): void`
over one `outbound_throttle` table keyed by source name — the shape
`cache_aside()` already has for Caches.

**Wins.** Locality: one place to fix the wait, one place to test it. Leverage:
six call sites, one implementation. The schema stops growing two tables per
source.

## 3. The outbound seam discards why a call failed — **worth exploring**

**Files:** `api/lib/http_client.php`, `api/health.php`,
`CommanderSpellbookClient`, `api/mtg/combos.php`

**Problem.** `http_get_raw()` returns `?string`: a DNS failure, a 403 and a
timeout are the same `null`. The status code and transport error exist inside
the module and are discarded at its interface. On 2026-08-15 that cost three
deploys — Commander Spellbook began answering 403 to production only, every
caller saw `null`, and the diagnosis needed a bespoke `probe_outbound()` added
to `health.php`: a second implementation of the same curl call, existing only
to see what the first one already knew.

**Solution.** Return a small result carrying body, HTTP status and transport
error. `http_get_json()` / `_xml()` / `_html()` keep their current shapes on
top of it, so no client changes. `health.php`'s probe collapses into a call to
the same module.

**Wins.** Locality: one module knows how an outbound call failed. Deletes the
duplicate curl implementation. A blocked source names itself the first time
instead of the third deploy. No change at any client's interface.

## 4. QueryState is shallow — **speculative**

**Files:** `frontend/src/components/QueryState.tsx` and its 12 call sites

**Problem.** Eight props over four `if` statements — the interface is as wide
as the implementation. Every caller passes `isLoading`, `isError` and a
hand-derived `isEmpty`, all three unpacked from the same query result.
Deletion test: deleting it moves the branches to callers rather than
concentrating them, so the answer is a narrower interface, not removal.

**Solution.** Take the query result itself and derive the states inside:
`<QueryState query={q} empty={…}>`, with loading and error slots defaulting.

**Wins.** Leverage: 12 call sites each learn less. Locality: "what counts as
empty" stops being re-decided per caller. Smallest win of the four — the
current shape is not causing bugs.

## Top recommendation

**Candidate 1.** Four adapters make the seam real rather than hypothetical, so
the design question is already answered and only the interface is missing. It
is also the change surface that keeps moving — `lookup.php`, `schema.sql` and
the rating clients dominate recent history, and ADR-0014 anticipates a fifth
Rating Source. Candidate 2 follows naturally afterwards: those adapters are
most of the six callers a shared throttle module would serve.
