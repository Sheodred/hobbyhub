# ADR-0015: One throttle module, six existing tables

- **Status:** Accepted
- **Date:** 2026-08-15
- **Supersedes in part:** [ADR-0011](./0011-boardgame-lookup-caching.md)

## Context

ADR-0011 chose a single-row throttle table per source, mirroring
`ScryfallClient`. That was recorded when the pattern had two instances. It
reached six: `ScryfallClient`, `BggClient`, `AmazonRatingClient`,
`BoardGameQuestClient`, `Hall9000Client`, `BrettspieleReportClient` each held
a `private function throttle()` that was byte-identical to the other five
apart from the table name, and none of them could be tested — the method was
private to each client and reachable only through a real outbound call.

The pacing itself was never in question. What ADR-0011 actually decided was
caching policy; the copied code came along as an unexamined consequence of
"mirror ScryfallClient".

## Decision

**One `throttle(string $table, int $minIntervalMs)` module
(`api/lib/Throttle.php`), called by all six clients — and the six existing
tables stay.**

Each client keeps its own interval constant, so the pacing policy stays with
the client that knows the source (BGG's ~2 req/sec, Amazon's deliberately
slow 2s). Only the waiting moved.

The tables were deliberately *not* consolidated into one table keyed by
source name, even though that is the tidier schema. Production runs on IONOS
Webhosting Plus, where the database is not reachable from outside their
network: every schema change is a hand-run migration through phpMyAdmin
(ADR-0009, and issue #41 for what that costs). Keeping the six tables makes
this refactor deploy with no migration at all. The consolidation remains
available if a seventh source ever makes the table count annoying; it is
marked with a `ponytail:` comment in the module.

## Consequences

- The wait computation has one implementation and one test (`ThrottleTest`),
  where previously it had six implementations and none.
- `$table` is interpolated into SQL, so it carries the same rule
  `cache_aside()` already carries: hardcoded literals only, never user input.
- The schema still grows a throttle table per throttled source. That is the
  accepted cost of a zero-migration change.
- `NominatimGeocodeClient` paces itself differently and was left alone; it is
  not one of the six.
