# Boardgame Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One search box (board game name) returns a BGG-sourced star rating, a good-vs-bad snippet, and a playstyle blurb, cached server-side per game so repeat searches are instant and BGG's ~2 req/sec convention is respected.

**Architecture:** A new `BggClient.php` (mirrors `ScryfallClient.php`) proxies BoardGameGeek's XML API2 through the existing `cache_aside()` helper, with a two-level cache (free-text query → `bgg_id`, then `bgg_id` → synthesized game data) and a throttle table, exposed via one endpoint (`GET /api/boardgames/lookup`) that a new React page consumes.

**Tech Stack:** PHP 8.3 (`api/`), MySQL/MariaDB, PHPUnit (`api/tests`), React + TypeScript (`frontend/src`), Vitest + React Testing Library.

## Global Constraints

- Follow `docs/adr/0011-boardgame-lookup-caching.md` (companion ADR) — cache-aside per game, BGG-only in v1, no LLM summarization, no multi-site scraping without a separate per-site ToS check first.
- Design source of truth: `docs/superpowers/specs/2026-08-14-boardgame-lookup-design.md`. Any conflict between this plan and that spec — the spec wins; stop and reconcile rather than guessing.
- **Open gap, not resolved by this plan:** the caching/staleness council review did not complete during verification (see spec's "Verification pass" section). The 14-day TTL and no-negative-caching behavior below are carried over from the `ScryfallClient` precedent, not independently re-verified for this feature. Task 2's tests cover the mechanics that exist; they do not re-litigate whether 14 days is the right number.
- No accounts exist in HobbyHub (post `docs/adr/0009`) — no "save to my list" feature, don't add one.
- Every `"status": "ok"` response body must include a `source` field crediting BoardGameGeek with a link back (legal requirement from the verification pass, not optional polish).
- UI copy in English only, per `docs/project-brief.md` section 7.

---

### Task 1: Database schema — three new cache tables

**Files:**
- Modify: `api/sql/schema.sql`

**Interfaces:**
- Produces: tables `bgg_lookup_cache(bgg_id INT PK, response_json LONGTEXT, expires_at DATETIME)`, `bgg_search_cache(query_key VARCHAR(255) PK, bgg_id INT, expires_at DATETIME)`, `bgg_throttle(id TINYINT PK DEFAULT 1, last_call_at DOUBLE)` — Task 2 depends on these exact names/columns.

- [ ] **Step 1: Append the three tables to `api/sql/schema.sql`**

Add at the end of the file:

```sql
-- Cache-aside table for BggClient::lookup(), shaped like scryfall_cache.
-- Long TTL (see BggClient::LOOKUP_CACHE_TTL_SECONDS) - board game ratings
-- and descriptions change far more slowly than MTG Standard metagame data.
CREATE TABLE bgg_lookup_cache (
    bgg_id INT PRIMARY KEY,
    response_json LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- Caches the free-text search -> resolved bgg_id mapping, so a repeat
-- search of the same query skips even the BGG /search call. Only the
-- single chosen id is cached here, never the full candidate list from a
-- disambiguation response.
CREATE TABLE bgg_search_cache (
    query_key VARCHAR(255) PRIMARY KEY,
    bgg_id INT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- Single row, mirrors scryfall_throttle - spaces outbound BGG requests
-- per the ~2 req/sec community-observed convention (BggClient::throttle()).
CREATE TABLE bgg_throttle (
    id TINYINT PRIMARY KEY DEFAULT 1,
    last_call_at DOUBLE NOT NULL
);
```

- [ ] **Step 2: Apply locally and verify**

Run: `docker compose exec -T db mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < api/sql/schema.sql` (or re-create the local docker-compose `db` volume so the mounted `/docker-entrypoint-initdb.d` script reapplies it — check `docker-compose.yml` for which applies in this repo).
Expected: no SQL errors; `SHOW TABLES LIKE 'bgg_%';` lists all three new tables.

- [ ] **Step 3: Commit**

```bash
git add api/sql/schema.sql
git commit -m "feat(boardgame-lookup): add bgg cache/throttle tables"
```

---

### Task 2: `BggClient.php` — BGG proxy with cache-aside + throttle

**Files:**
- Modify: `api/lib/http_client.php` (add `http_get_xml()`)
- Create: `api/lib/BggClient.php`
- Test: `api/tests/BggClientTest.php`

**Interfaces:**
- Consumes: `cache_aside(string $table, string $keyColumn, string $key, int $ttlSeconds, callable $fetch)` from `api/lib/Cache.php` (existing, unchanged). `db()` from `api/lib/db.php` (existing). `http_get_raw()` from `api/lib/http_client.php` (existing). `SCRYFALL_USER_AGENT` constant from `api/config.php` (existing — already reused generically as the app's crawler UA by `http_get_html()`, e.g. for MTGGoldfish; reuse it here too rather than defining a near-duplicate constant).
- Produces: `BggClient::resolveSearch(string $query): array` returning one of
  `['status' => 'ok', 'bggId' => int]`,
  `['status' => 'disambiguation', 'candidates' => array<array{bggId:int,name:string,yearPublished:?int}>]`,
  `['status' => 'not_found']`.
  `BggClient::lookup(int $bggId): ?array` returning `null` (not found) or
  `['bggId' => int, 'name' => string, 'description' => string, 'rating' => ?float, 'numRatings' => ?int, 'good' => ?string, 'bad' => ?string, 'source' => ['name' => 'BoardGameGeek', 'url' => string]]`.
  Task 3 (the endpoint) calls both of these directly.

- [ ] **Step 1: Add `http_get_xml()` to `api/lib/http_client.php`**

BGG's API returns XML, unlike Scryfall/EDHREC's JSON — this is the one new primitive needed, added next to the existing `http_get_json()`/`http_get_html()` in the same file rather than inventing a separate HTTP layer:

```php
function http_get_xml(string $url, int $timeoutSeconds = 10, array $headers = []): ?SimpleXMLElement
{
    $body = http_get_raw($url, $timeoutSeconds, array_merge(['Accept: application/xml', 'User-Agent: ' . SCRYFALL_USER_AGENT], $headers));
    if ($body === null) {
        return null;
    }
    $xml = @simplexml_load_string($body);
    return $xml === false ? null : $xml;
}
```

- [ ] **Step 2: Write the failing tests for `lookup()` cache behavior**

Create `api/tests/BggClientTest.php`, modeled directly on `api/tests/ScryfallClientTest.php`:

```php
<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BggClient.php';

final class BggClientTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgg_lookup_cache');
        db()->exec('DELETE FROM bgg_search_cache');
    }

    private function thingXml(string $inner): SimpleXMLElement
    {
        return new SimpleXMLElement('<items>' . $inner . '</items>');
    }

    public function testLookupCacheMissCallsFetcherAndMapsResult(): void
    {
        $calls = 0;
        $client = new BggClient(function () use (&$calls) {
            $calls++;
            return $this->thingXml(
                '<item id="13">' .
                '<name type="primary" value="Catan"/>' .
                '<description>Trade, build, settle.</description>' .
                '<statistics><ratings><average value="7.15"/><usersrated value="1000"/></ratings></statistics>' .
                '<comments>' .
                '<comment username="a" rating="9" value="Great trading game."/>' .
                '<comment username="b" rating="3" value="Too much luck."/>' .
                '</comments>' .
                '</item>'
            );
        });

        $result = $client->lookup(13);

        $this->assertSame(1, $calls);
        $this->assertSame('Catan', $result['name']);
        $this->assertSame(7.2, $result['rating']); // rounds 7.15 to 1 decimal
        $this->assertSame(1000, $result['numRatings']);
        $this->assertSame('Great trading game.', $result['good']);
        $this->assertSame('Too much luck.', $result['bad']);
        $this->assertSame(['name' => 'BoardGameGeek', 'url' => 'https://boardgamegeek.com/boardgame/13'], $result['source']);
    }

    public function testLookupCacheHitDoesNotCallFetcherAgain(): void
    {
        $calls = 0;
        $fetcher = function () use (&$calls) {
            $calls++;
            return $this->thingXml('<item id="42"><name type="primary" value="Wingspan"/><description>Birds.</description></item>');
        };

        (new BggClient($fetcher))->lookup(42);
        (new BggClient($fetcher))->lookup(42);

        $this->assertSame(1, $calls, 'second lookup within the TTL should be served from bgg_lookup_cache');
    }

    public function testLookupExpiredCacheEntryTriggersRefetch(): void
    {
        $calls = 0;
        $fetcher = function () use (&$calls) {
            $calls++;
            return $this->thingXml('<item id="7"><name type="primary" value="Azul"/><description>Tiles.</description></item>');
        };

        (new BggClient($fetcher))->lookup(7);
        db()->exec("UPDATE bgg_lookup_cache SET expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE bgg_id = 7");
        (new BggClient($fetcher))->lookup(7);

        $this->assertSame(2, $calls, 'an expired cache row must not be served');
    }

    public function testLookupReturnsNullWhenThingNotFound(): void
    {
        $client = new BggClient(fn() => null);

        $this->assertNull($client->lookup(999999));
    }
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd api && ./vendor/bin/phpunit tests/BggClientTest.php`
Expected: FAIL — `Class "BggClient" not found`.

- [ ] **Step 4: Implement `api/lib/BggClient.php` (lookup half only)**

```php
<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';

// On-demand cache-aside proxy to BoardGameGeek's XML API2 (docs/adr/0011).
// Two-level cache: bgg_search_cache (free-text query -> resolved bgg_id,
// Task in this class below) and bgg_lookup_cache (bgg_id -> synthesized
// game data, this half). Both long-TTL since board game ratings and
// descriptions change far more slowly than MTG Standard metagame data
// (contrast with ScryfallClient's 5-minute TTL). Throttled the same way
// ScryfallClient is, tuned to BGG's ~2 req/sec community-observed
// convention (not officially documented by BGG - best-effort, same as
// Scryfall's own guideline).
class BggClient
{
    private const LOOKUP_CACHE_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days
    private const SEARCH_CACHE_TTL_SECONDS = 14 * 24 * 60 * 60;
    private const THROTTLE_MIN_INTERVAL_MS = 500; // ~2 req/sec
    private const BASE_URL = 'https://boardgamegeek.com/xmlapi2';
    private const MAX_COMMENTS = 100; // one page - see pickGoodBad()

    /** @var callable */
    private $httpGetXml;

    public function __construct(?callable $httpGetXml = null)
    {
        $this->httpGetXml = $httpGetXml ?? 'http_get_xml';
    }

    public function lookup(int $bggId): ?array
    {
        return $this->cached($bggId, function () use ($bggId) {
            $this->throttle();
            $xml = ($this->httpGetXml)(self::BASE_URL . '/thing?' . http_build_query([
                'id' => $bggId,
                'stats' => 1,
                'comments' => 1,
                'ratingcomments' => 1,
                'pagesize' => self::MAX_COMMENTS,
            ]));
            if ($xml === null || !isset($xml->item)) {
                return null;
            }
            return $this->mapThing($xml->item);
        });
    }

    private function mapThing(SimpleXMLElement $item): array
    {
        $name = '';
        foreach ($item->name as $n) {
            if ((string) $n['type'] === 'primary') {
                $name = (string) $n['value'];
                break;
            }
        }
        [$good, $bad] = $this->pickGoodBad($item->comments->comment ?? []);
        $bggId = (int) $item['id'];

        return [
            'bggId' => $bggId,
            'name' => $name,
            'description' => html_entity_decode(strip_tags((string) $item->description), ENT_QUOTES),
            'rating' => isset($item->statistics->ratings->average) ? round((float) $item->statistics->ratings->average['value'], 1) : null,
            'numRatings' => isset($item->statistics->ratings->usersrated) ? (int) $item->statistics->ratings->usersrated['value'] : null,
            'good' => $good,
            'bad' => $bad,
            'source' => ['name' => 'BoardGameGeek', 'url' => 'https://boardgamegeek.com/boardgame/' . $bggId],
        ];
    }

    // Best-effort: picks the highest- and lowest-rated comment from the
    // single page of up to MAX_COMMENTS returned by the thing endpoint -
    // NOT a guaranteed global max/min across every rating BGG holds (the
    // API has no "sort comments by rating" option). Good enough for a
    // short "good vs. bad" snippet without a second data source or an
    // LLM call; upgrade to paging through all comments if this proves
    // too shallow in practice.
    private function pickGoodBad(iterable $comments): array
    {
        $best = null;
        $worst = null;
        foreach ($comments as $comment) {
            $rating = (float) $comment['rating'];
            $text = trim((string) $comment['value']);
            if ($text === '' || $rating <= 0) {
                continue; // BGG uses a non-numeric rating for comments with no rating
            }
            if ($best === null || $rating > $best['rating']) {
                $best = ['rating' => $rating, 'text' => $text];
            }
            if ($worst === null || $rating < $worst['rating']) {
                $worst = ['rating' => $rating, 'text' => $text];
            }
        }
        return [
            $best ? $this->truncate($best['text']) : null,
            ($worst && $worst !== $best) ? $this->truncate($worst['text']) : null,
        ];
    }

    private function truncate(string $text, int $maxLength = 280): string
    {
        return mb_strlen($text) <= $maxLength ? $text : mb_substr($text, 0, $maxLength) . '…';
    }

    private function cached(int $bggId, callable $fetch): ?array
    {
        return cache_aside('bgg_lookup_cache', 'bgg_id', (string) $bggId, self::LOOKUP_CACHE_TTL_SECONDS, $fetch);
    }

    private function throttle(): void
    {
        $pdo = db();
        $stmt = $pdo->query('SELECT last_call_at FROM bgg_throttle WHERE id = 1');
        $row = $stmt->fetch();

        $now = microtime(true);
        if ($row) {
            $elapsedMs = ($now - (float) $row['last_call_at']) * 1000;
            if ($elapsedMs < self::THROTTLE_MIN_INTERVAL_MS) {
                usleep((int) ((self::THROTTLE_MIN_INTERVAL_MS - $elapsedMs) * 1000));
            }
        }

        $now = microtime(true);
        $stmt = $pdo->prepare(
            'INSERT INTO bgg_throttle (id, last_call_at) VALUES (1, ?) ON DUPLICATE KEY UPDATE last_call_at = ?'
        );
        $stmt->execute([$now, $now]);
    }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd api && ./vendor/bin/phpunit tests/BggClientTest.php`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add api/lib/http_client.php api/lib/BggClient.php api/tests/BggClientTest.php
git commit -m "feat(boardgame-lookup): add BggClient thing-lookup with cache-aside"
```

- [ ] **Step 7: Write the failing tests for `resolveSearch()`**

Append to `api/tests/BggClientTest.php`:

```php
    private function searchXml(string $inner): SimpleXMLElement
    {
        return new SimpleXMLElement('<items>' . $inner . '</items>');
    }

    public function testResolveSearchSingleMatchResolvesAndCaches(): void
    {
        $calls = 0;
        $fetcher = function () use (&$calls) {
            $calls++;
            return $this->searchXml('<item id="13" type="boardgame"><name type="primary" value="Catan"/><yearpublished value="1995"/></item>');
        };

        $result = (new BggClient($fetcher))->resolveSearch('catan');
        $this->assertSame(['status' => 'ok', 'bggId' => 13], $result);

        // Second call for the same (normalized) query must hit
        // bgg_search_cache, not the fetcher again.
        $second = (new BggClient($fetcher))->resolveSearch('  Catan ');
        $this->assertSame(['status' => 'ok', 'bggId' => 13], $second);
        $this->assertSame(1, $calls, 'resolved query should be served from bgg_search_cache on repeat, case/whitespace-insensitive');
    }

    public function testResolveSearchMultipleMatchesReturnsDisambiguationWithoutCaching(): void
    {
        $calls = 0;
        $fetcher = function () use (&$calls) {
            $calls++;
            return $this->searchXml(
                '<item id="13" type="boardgame"><name type="primary" value="Catan"/><yearpublished value="1995"/></item>' .
                '<item id="1234" type="boardgame"><name type="primary" value="Catan: Cities and Knights"/><yearpublished value="1998"/></item>'
            );
        };

        $result = (new BggClient($fetcher))->resolveSearch('catan');

        $this->assertSame('disambiguation', $result['status']);
        $this->assertCount(2, $result['candidates']);
        $this->assertSame(['bggId' => 13, 'name' => 'Catan', 'yearPublished' => 1995], $result['candidates'][0]);

        (new BggClient($fetcher))->resolveSearch('catan');
        $this->assertSame(2, $calls, 'an ambiguous query must not be cached - it should re-search every time until resolved');
    }

    public function testResolveSearchNoMatchesReturnsNotFound(): void
    {
        $client = new BggClient(fn() => $this->searchXml(''));

        $this->assertSame(['status' => 'not_found'], $client->resolveSearch('zzzznonexistentgamezzzz'));
    }
```

- [ ] **Step 8: Run the tests to verify they fail**

Run: `cd api && ./vendor/bin/phpunit tests/BggClientTest.php`
Expected: FAIL — `resolveSearch` undefined.

- [ ] **Step 9: Implement `resolveSearch()` in `BggClient.php`**

Add this method to the class (near `lookup()`), plus its private cache helper:

```php
    /**
     * @return array{status:'ok',bggId:int}|array{status:'disambiguation',candidates:array}|array{status:'not_found'}
     */
    public function resolveSearch(string $query): array
    {
        $normalized = strtolower(trim($query));

        $stmt = db()->prepare('SELECT bgg_id FROM bgg_search_cache WHERE query_key = ? AND expires_at > NOW()');
        $stmt->execute([$normalized]);
        $row = $stmt->fetch();
        if ($row) {
            return ['status' => 'ok', 'bggId' => (int) $row['bgg_id']];
        }

        $this->throttle();
        $xml = ($this->httpGetXml)(self::BASE_URL . '/search?' . http_build_query(['type' => 'boardgame', 'query' => $query]));
        $items = $xml === null ? [] : $xml->item;
        $count = $items === [] ? 0 : count($items);

        if ($count === 0) {
            return ['status' => 'not_found'];
        }

        if ($count === 1) {
            $bggId = (int) $items[0]['id'];
            $this->cacheResolvedSearch($normalized, $bggId);
            return ['status' => 'ok', 'bggId' => $bggId];
        }

        $candidates = [];
        foreach ($items as $item) {
            $candidates[] = [
                'bggId' => (int) $item['id'],
                'name' => (string) ($item->name['value'] ?? ''),
                'yearPublished' => isset($item->yearpublished) ? (int) $item->yearpublished['value'] : null,
            ];
        }
        // Deliberately not cached - an ambiguous query has no single
        // bgg_id to store against bgg_search_cache's one-id-per-query
        // shape, and the disambiguation list itself is cheap to
        // re-fetch (it's only shown once per genuinely ambiguous title).
        return ['status' => 'disambiguation', 'candidates' => $candidates];
    }

    private function cacheResolvedSearch(string $normalizedQuery, int $bggId): void
    {
        $stmt = db()->prepare(
            'REPLACE INTO bgg_search_cache (query_key, bgg_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))'
        );
        $stmt->execute([$normalizedQuery, $bggId, self::SEARCH_CACHE_TTL_SECONDS]);
    }
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `cd api && ./vendor/bin/phpunit tests/BggClientTest.php`
Expected: PASS (7 tests total).

- [ ] **Step 11: Commit**

```bash
git add api/lib/BggClient.php api/tests/BggClientTest.php
git commit -m "feat(boardgame-lookup): add BggClient search resolution and disambiguation"
```

---

### Task 3: `GET /api/boardgames/lookup` endpoint

**Files:**
- Create: `api/boardgames/lookup.php`

**Interfaces:**
- Consumes: `BggClient::resolveSearch(string $query): array`, `BggClient::lookup(int $bggId): ?array` (Task 2). `json_response()`/`error_response()` from `api/lib/http.php` (existing).
- Produces: `GET /api/boardgames/lookup?q=...` or `?bgg_id=...` — response bodies `{"status":"ok","game":{...}}` (200), `{"status":"disambiguation","candidates":[...]}` (200), `{"message":"..."}` (400/404/502). Task 4 (frontend) depends on this exact shape.

- [ ] **Step 1: Implement the endpoint**

```php
<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';

$q = trim($_GET['q'] ?? '');
$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;

if ($q === '' && $bggId === null) {
    error_response('q or bgg_id is required', 400);
}

try {
    $client = new BggClient();

    if ($bggId === null) {
        $resolved = $client->resolveSearch($q);
        if ($resolved['status'] === 'not_found') {
            error_response('No board game found for that name.', 404);
        }
        if ($resolved['status'] === 'disambiguation') {
            json_response(['status' => 'disambiguation', 'candidates' => $resolved['candidates']]);
        }
        $bggId = $resolved['bggId'];
    }

    $game = $client->lookup($bggId);
    if ($game === null) {
        error_response('That board game could not be found on BoardGameGeek.', 404);
    }
    json_response(['status' => 'ok', 'game' => $game]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
```

- [ ] **Step 2: Manual verification against local docker-compose**

Run: `curl "http://localhost:8080/api/boardgames/lookup?q=catan"` (adjust host/port to match this repo's local `docker-compose.yml`).
Expected: a `200` JSON body with `status: "ok"` and a `game` object (or `disambiguation`/`404` depending on real BGG data — this is a live call, not a unit test).

No PHPUnit test file for this endpoint — matches the existing convention: `api/mtg/search.php`, `api/mtg/combos.php`, and `api/mtg/meta.php` are all thin wiring over an already-tested client class with no endpoint-level test of their own.

- [ ] **Step 3: Commit**

```bash
git add api/boardgames/lookup.php
git commit -m "feat(boardgame-lookup): add lookup endpoint"
```

---

### Task 4: Frontend API client

**Files:**
- Create: `frontend/src/features/boardgames/api.ts`
- Test: `frontend/src/features/boardgames/api.test.ts`

**Interfaces:**
- Consumes: `apiFetch<T>(path: string): Promise<T>` from `frontend/src/lib/apiClient.ts` (existing).
- Produces: `lookupBoardgame(query: string): Promise<BoardgameLookupResult>`, `lookupBoardgameById(bggId: number): Promise<BoardgameLookupResult>`, and the `BoardgameLookupResult` discriminated union type. Task 5 (the page) consumes these.

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/features/boardgames/api.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { lookupBoardgame } from "./api";

describe("lookupBoardgame", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("requests the lookup endpoint with the query param and returns the parsed body", async () => {
    const body = { status: "ok", game: { bggId: 13, name: "Catan" } };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    });

    const result = await lookupBoardgame("catan");

    expect(fetch).toHaveBeenCalledWith("/api/boardgames/lookup?q=catan", expect.anything());
    expect(result).toEqual(body);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/features/boardgames/api.test.ts`
Expected: FAIL — cannot find module `./api`.

- [ ] **Step 3: Implement `frontend/src/features/boardgames/api.ts`**

```typescript
import { apiFetch } from "../../lib/apiClient";

export interface BoardgameCandidate {
  bggId: number;
  name: string;
  yearPublished: number | null;
}

export interface BoardgameSource {
  name: string;
  url: string;
}

export interface Boardgame {
  bggId: number;
  name: string;
  description: string;
  rating: number | null;
  numRatings: number | null;
  good: string | null;
  bad: string | null;
  source: BoardgameSource;
}

export type BoardgameLookupResult =
  | { status: "ok"; game: Boardgame }
  | { status: "disambiguation"; candidates: BoardgameCandidate[] };

export function lookupBoardgame(query: string): Promise<BoardgameLookupResult> {
  const params = new URLSearchParams({ q: query });
  return apiFetch<BoardgameLookupResult>(`/api/boardgames/lookup?${params.toString()}`);
}

export function lookupBoardgameById(bggId: number): Promise<BoardgameLookupResult> {
  const params = new URLSearchParams({ bgg_id: String(bggId) });
  return apiFetch<BoardgameLookupResult>(`/api/boardgames/lookup?${params.toString()}`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/features/boardgames/api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/boardgames/api.ts frontend/src/features/boardgames/api.test.ts
git commit -m "feat(boardgame-lookup): add frontend API client"
```

---

### Task 5: `BoardgameLookupPage` — search box, result card, disambiguation list

**Files:**
- Create: `frontend/src/features/boardgames/BoardgameLookupPage.tsx`
- Test: `frontend/src/features/boardgames/BoardgameLookupPage.test.tsx`
- Modify: `frontend/src/app/routes.tsx` (add `/boardgames` route)
- Modify: `frontend/src/layout/navigation.ts` (add nav link)

**Interfaces:**
- Consumes: `lookupBoardgame`, `lookupBoardgameById`, `BoardgameLookupResult`, `Boardgame`, `BoardgameCandidate` (Task 4). `FadeIn` from `frontend/src/components/FadeIn.tsx` (existing, used by every other page's content block per `MtgPage.tsx`).

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/features/boardgames/BoardgameLookupPage.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BoardgameLookupPage } from "./BoardgameLookupPage";
import * as api from "./api";

describe("BoardgameLookupPage", () => {
  it("shows the game's rating, good/bad snippet, and BGG source credit after a search", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13,
        name: "Catan",
        description: "Trade, build, settle.",
        rating: 7.2,
        numRatings: 1000,
        good: "Great trading game.",
        bad: "Too much luck.",
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByText("Catan")).toBeInTheDocument());
    expect(screen.getByText("7.2")).toBeInTheDocument();
    expect(screen.getByText("Great trading game.")).toBeInTheDocument();
    expect(screen.getByText("Too much luck.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /BoardGameGeek/i })).toHaveAttribute(
      "href",
      "https://boardgamegeek.com/boardgame/13"
    );
  });

  it("shows a disambiguation list and resolves the picked candidate", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "disambiguation",
      candidates: [
        { bggId: 13, name: "Catan", yearPublished: 1995 },
        { bggId: 1234, name: "Catan: Cities and Knights", yearPublished: 1998 },
      ],
    });
    vi.spyOn(api, "lookupBoardgameById").mockResolvedValue({
      status: "ok",
      game: {
        bggId: 13,
        name: "Catan",
        description: "Trade, build, settle.",
        rating: 7.2,
        numRatings: 1000,
        good: null,
        bad: null,
        source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      },
    });

    render(<BoardgameLookupPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    const option = await screen.findByRole("button", { name: /Catan \(1995\)/ });
    fireEvent.click(option);

    await waitFor(() => expect(api.lookupBoardgameById).toHaveBeenCalledWith(13));
    expect(await screen.findByText("Trade, build, settle.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/features/boardgames/BoardgameLookupPage.test.tsx`
Expected: FAIL — cannot find module `./BoardgameLookupPage`.

- [ ] **Step 3: Implement `BoardgameLookupPage.tsx`**

```tsx
import { FormEvent, useState } from "react";
import { FadeIn } from "../../components/FadeIn";
import { Boardgame, BoardgameCandidate, lookupBoardgame, lookupBoardgameById } from "./api";
import { ApiError } from "../../lib/apiClient";

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "disambiguation"; candidates: BoardgameCandidate[] }
  | { kind: "result"; game: Boardgame };

export function BoardgameLookupPage() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ViewState>({ kind: "idle" });

  async function runSearch(e: FormEvent) {
    e.preventDefault();
    if (query.trim() === "") return;
    setState({ kind: "loading" });
    try {
      const result = await lookupBoardgame(query);
      applyResult(result);
    } catch (err) {
      setState({ kind: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
    }
  }

  async function pick(bggId: number) {
    setState({ kind: "loading" });
    try {
      applyResult(await lookupBoardgameById(bggId));
    } catch (err) {
      setState({ kind: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
    }
  }

  function applyResult(result: Awaited<ReturnType<typeof lookupBoardgame>>) {
    if (result.status === "ok") {
      setState({ kind: "result", game: result.game });
    } else {
      setState({ kind: "disambiguation", candidates: result.candidates });
    }
  }

  return (
    <FadeIn>
      <h1>Boardgame Lookup</h1>
      <form role="search" onSubmit={runSearch}>
        <input
          role="searchbox"
          aria-label="Board game name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {state.kind === "loading" && <p>Loading…</p>}
      {state.kind === "error" && <p role="alert">{state.message}</p>}

      {state.kind === "disambiguation" && (
        <ul>
          {state.candidates.map((c) => (
            <li key={c.bggId}>
              <button type="button" onClick={() => pick(c.bggId)}>
                {c.name} {c.yearPublished ? `(${c.yearPublished})` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}

      {state.kind === "result" && (
        <article>
          <h2>{state.game.name}</h2>
          {state.game.rating !== null && <p>{state.game.rating}</p>}
          <p>{state.game.description}</p>
          {state.game.good && <p>Good: {state.game.good}</p>}
          {state.game.bad && <p>Bad: {state.game.bad}</p>}
          <p>
            Data via{" "}
            <a href={state.game.source.url} target="_blank" rel="noreferrer">
              {state.game.source.name}
            </a>
          </p>
        </article>
      )}
    </FadeIn>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/features/boardgames/BoardgameLookupPage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the route**

In `frontend/src/app/routes.tsx`, add the import and route entry:

```typescript
import { BoardgameLookupPage } from "../features/boardgames/BoardgameLookupPage";
// ...
{ path: "/boardgames", element: <BoardgameLookupPage /> },
```

- [ ] **Step 6: Add the nav link**

In `frontend/src/layout/navigation.ts`, add to `primaryNavLinks`:

```typescript
{ to: "/boardgames", label: "Boardgame Lookup" },
```

- [ ] **Step 7: Run the full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: all tests PASS, including `App.test.tsx`/nav-related snapshot or link-count tests if any exist — check their output for a hardcoded nav-link count that would need updating.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/boardgames frontend/src/app/routes.tsx frontend/src/layout/navigation.ts
git commit -m "feat(boardgame-lookup): add search page, route, and nav link"
```

---

## Deferred (explicit non-goals, not silent gaps — see spec)

- [ ] Multi-site review scraping beyond BGG — blocked on a per-site robots.txt/ToS check (none done yet for any specific site).
- [x] Re-verify the 14-day cache TTL and no-negative-caching behavior — done 2026-08-15 by reading the code instead of re-running the council review. `cache_aside()` did cache a failed fetch's `null` for the full TTL; fixed at the root (see ADR-0011 Consequences). 14-day TTL stands.
- [ ] **BLOCKED — BGG XML API now returns 401 without a registered application token** ([#40](https://github.com/Sheodred/hobbyhub/issues/40)). All five tasks below are implemented and tested, but the happy path has never run against real BGG data. Needs a human registration step before this can ship.
- [ ] LLM-based summarization of the good/bad blurb (currently a deterministic pick-from-fetched-comments heuristic).
