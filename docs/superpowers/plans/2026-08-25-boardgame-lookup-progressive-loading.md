# Boardgame Lookup Progressive Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut a cold boardgame lookup from 24.2s (measured live on production) of blank-screen waiting down to a page that renders BGG's own data almost immediately and fills in each external section (ratings, prices, how-it-plays, facts) independently as its own source answers.

**Architecture:** Split the single synchronous `api/boardgames/lookup.php` into six endpoints - one per external source (`bgg.php`, `amazon.php`, `boardgamequest.php`, `hall9000.php`, `brettspielereport.php`, `brettspielpreise.php`) - fired in true parallel by the frontend. Each of the five non-`bgg.php` endpoints resolves its own search name locally (no live BGG call, no thundering herd) and is Best-Effort (`200` with `null` data on any failure). The frontend merges whichever responses have arrived so far via one pure, independently-tested function, and each UI section carries its own small loading indicator instead of one global "still loading" message.

**Tech Stack:** PHP 8.3 (no framework, existing `cache_aside()`/`throttle()` primitives), React + TypeScript (Vite), PHPUnit, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-boardgame-lookup-progressive-loading-design.md`

## Global Constraints

- Every new/changed endpoint follows the existing Best-Effort contract: a failed external source is logged (`error_log`) and answered as `null` data with HTTP 200, never a 4xx/5xx - only `bgg.php` can fail the whole card (mirrors today's `lookup.php` 404/502 behavior).
- No new dependency, no new infrastructure - `curl` (via `http_client.php`), `cache_aside()`, `throttle()`, and plain parallel `fetch()` calls are sufficient.
- `Boardgame`'s public TypeScript shape (`frontend/src/features/boardgames/api.ts`) keeps `players`/`duration`/`age` as already-labeled display strings (`"2 - 4 Spieler"`) - only *how* they're built changes (frontend merge function, not backend), so existing test fixtures asserting these fields as literal strings do not need type changes.
- Every PHP test run: rebuild the container first (`docker compose up -d --build php`), then run inside it against `hh-test-db`, per `docs/agents/pitfalls.md`. Every frontend test run: `npx vitest run` from `frontend/`.
- Follow TDD: write the failing test, watch it fail for the right reason, write minimal code, watch it pass.

---

## Task 1: Raise Brettspielpreise.de's cache TTL to 7 days

**Files:**
- Modify: `api/lib/BrettspielpreiseClient.php:17,22`

**Interfaces:**
- Produces: no change to any public method signature.

- [ ] **Step 1: Change the constants**

```php
private const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // #180: 24h re-fetched every single day, 7d matches Amazon's cadence
private const MISS_TTL_SECONDS = 7 * 24 * 60 * 60;
```

- [ ] **Step 2: Run the existing test file to confirm nothing broke**

Rebuild the container and run:
```bash
docker compose up -d --build php
docker compose exec -T -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test php sh -c 'cd api && ./vendor/bin/phpunit --filter BrettspielpreiseClientTest'
```
Expected: `OK (5 tests, ...)` - no test in this file asserts the numeric TTL value, only caching *behavior*, so this is a pure constant change with no test to update.

- [ ] **Step 3: Commit**

```bash
git add api/lib/BrettspielpreiseClient.php
git commit -m "Raise Brettspielpreise.de cache TTL from 24h to 7 days (#180)"
```

---

## Task 2: Strip unit words from H@LL9000's duration/age

**Files:**
- Modify: `api/lib/Hall9000Client.php:55-74,138-146`
- Test: `api/tests/GermanRatingClientsTest.php:28-53`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Hall9000Client::ratingFor(string $gameName): ?array{rating:float,max:int,count:?int,players:?string,duration:?string,age:?int,url:string}` - `duration` is now a bare number/range (`"30 - 45"`, `"60"`) with no `" Minuten"` suffix; `age` is now `?int` (`8`, not `"ab 8 Jahren"`).

- [ ] **Step 1: Update the failing test expectations**

In `api/tests/GermanRatingClientsTest.php`, find the two assertions:
```php
$this->assertSame('30 - 45 Minuten', $r['duration']);
$this->assertSame('ab 8 Jahren', $r['age']);
```
Replace with:
```php
$this->assertSame('30 - 45', $r['duration']);
$this->assertSame(8, $r['age']);
```
Leave `$this->assertSame('2 - 4', $r['players']);` and the `assertNull($r['age'], ...)` case untouched - `players` never had a unit word, and the null case stays null.

- [ ] **Step 2: Run to verify it fails**

```bash
docker compose exec -T -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test php sh -c 'cd api && ./vendor/bin/phpunit --filter GermanRatingClientsTest'
```
Expected: FAIL on the duration/age assertions - `'30 - 45 Minuten' !== '30 - 45 Minuten'`... actually the code still returns the old value, so the *test* now expects `'30 - 45'` but gets `'30 - 45 Minuten'`: `Failed asserting that two strings are identical. --- Expected +++ Actual`.

- [ ] **Step 3: Implement the stripping**

In `api/lib/Hall9000Client.php`, replace the `ratingFor()` return block and add two private helpers:

```php
        return [
            'rating' => $rating,
            'max' => self::MAX_RATING,
            'count' => (int) $m[2],
            'players' => $this->field($text, 'Spieler'),
            'duration' => $this->numericPrefix($this->field($text, 'Dauer')),
            'age' => $this->numericAge($this->field($text, 'Alter')),
            'url' => self::GAME_URL . $slug,
        ];
    }

    // "Spieler: 2 - 4", "Dauer: 30 - 45 Minuten", "Alter: ab 8 Jahren"
    private function field(string $text, string $label): ?string
    {
        if (!preg_match('/' . preg_quote($label, '/') . ':\s*([^:]{1,40}?)\s+(?:Dauer|Alter|Jahr|Bewertung|Verlag):/iu', $text, $m)) {
            return null;
        }
        $value = trim($m[1]);
        return $value === '' ? null : $value;
    }

    // #180/#186: BGG's own facts carry no unit word either ("2 - 4", not
    // "2 - 4 Spieler") - labeling moved to the frontend so both sources
    // speak the same unit-free language and the page applies one
    // consistent, language-toggle-aware label instead of whichever source
    // happened to answer baking in its own (German) words.
    private function numericPrefix(?string $raw): ?string
    {
        if ($raw === null || !preg_match('/\d[\d\s\-–]*\d|\d+/', $raw, $m)) {
            return null;
        }
        return trim($m[0]);
    }

    // Age is always a single minimum, never a range ("ab 8 Jahren" -> 8).
    private function numericAge(?string $raw): ?int
    {
        $stripped = $this->numericPrefix($raw);
        return $stripped === null ? null : (int) $stripped;
    }
```

Also update the class docblock at line 55 from `age:?string` to `age:?int`.

- [ ] **Step 4: Run to verify it passes**

Same command as Step 2. Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add api/lib/Hall9000Client.php api/tests/GermanRatingClientsTest.php
git commit -m "Strip unit words from H@LL9000's duration/age (#180/#186)"
```

---

## Task 3: Strip unit words from BGG's own duration/age, add `localSearchNames()`

**Files:**
- Modify: `api/lib/BggClient.php:1063-1114` (facts formatting), add new public method near `searchNames()` (~line 775)
- Test: `api/tests/BggClientTest.php:603-670`

**Interfaces:**
- Consumes: `db()` (`api/lib/db.php`), existing `aliasNames(int $bggId): array` (already public, `BggClient.php:748`).
- Produces:
  - `BggClient::mapThing()`'s `duration` field: bare number/range string (`"60"`, no `" Minuten"`).
  - `BggClient::mapThing()`'s `age` field: now `?int` (was `?string`), via a renamed `minAge()` (was `ageLabel()`).
  - New: `BggClient::localSearchNames(int $bggId): array` - `[$primaryName] + aliasNames($bggId)`, resolved from `bgg_ranks`/`game_aliases` only, no live BGG call. Empty array when the dump has no row for this id.

- [ ] **Step 1: Update the failing test expectations**

In `api/tests/BggClientTest.php`, in `testLookupExposesGermanPhrasedFactsWhenBggPublishesThem` (or equivalent, around line 603):
```php
$this->assertSame('60 Minuten', $result['duration']);
$this->assertSame('ab 13 Jahren', $result['age']);
```
becomes
```php
$this->assertSame('60', $result['duration']);
$this->assertSame(13, $result['age']);
```
And around line 623:
```php
$this->assertSame('90 Minuten', $result['duration']);
```
becomes
```php
$this->assertSame('90', $result['duration']);
```
Leave the `players` assertions and the all-null test (lines ~660-669) untouched.

- [ ] **Step 2: Add a new failing test for `localSearchNames()`**

Add to `api/tests/BggClientTest.php` (needs `seedRanks()`, already defined in this file - see line 18):

```php
    public function testLocalSearchNamesCombinesThePrimaryDumpNameWithCuratedAliases(): void
    {
        $this->seedRanks(); // seeds bgg_id 13 = "Catan"
        db()->exec("INSERT INTO game_aliases (bgg_id, name) VALUES (13, 'Die Siedler von Catan')");

        $names = (new BggClient(fn() => null))->localSearchNames(13);

        $this->assertSame(['Catan', 'Die Siedler von Catan'], $names);
    }

    public function testLocalSearchNamesIsEmptyWhenTheDumpHasNoRowForThisId(): void
    {
        $this->assertSame([], (new BggClient(fn() => null))->localSearchNames(999999));
    }

    public function testLocalSearchNamesNeverCallsBgg(): void
    {
        $this->seedRanks();
        $calls = 0;
        $names = (new BggClient(function () use (&$calls) {
            $calls++;
            return null;
        }))->localSearchNames(13);

        $this->assertSame(0, $calls, 'localSearchNames must resolve from bgg_ranks/game_aliases only');
        $this->assertSame(['Catan'], $names);
    }
```

- [ ] **Step 3: Run to verify the new tests fail and the facts tests fail**

```bash
docker compose up -d --build php
docker compose exec -T -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test php sh -c 'cd api && ./vendor/bin/phpunit --filter BggClientTest'
```
Expected: FAIL - the facts assertions fail on the old ` Minuten`/`ab N Jahren` values, and `localSearchNames` fails with "Call to undefined method BggClient::localSearchNames()".

- [ ] **Step 4: Implement**

In `api/lib/BggClient.php`, replace `durationRange()` and `ageLabel()`:

```php
    private static function durationRange(SimpleXMLElement $item): ?string
    {
        $min = isset($item->minplaytime) ? (int) $item->minplaytime['value'] : 0;
        $max = isset($item->maxplaytime) ? (int) $item->maxplaytime['value'] : 0;
        if ($min <= 0 && $max <= 0) {
            return null;
        }
        // #180/#186: no unit word here any more - the frontend labels this,
        // consistently with H@LL9000's now-equally-unit-free duration, in
        // whichever of DE/EN the page is currently showing.
        return $min > 0 && $max > 0 && $min !== $max ? "$min - $max" : (string) max($min, $max);
    }

    private static function minAge(SimpleXMLElement $item): ?int
    {
        $age = isset($item->minage) ? (int) $item->minage['value'] : 0;
        return $age > 0 ? $age : null;
    }
```

Update the one call site (in `mapThing()`, the line reading `'age' => self::ageLabel($item),`) to `'age' => self::minAge($item),`.

Add `localSearchNames()` right after `searchNames()` (~line 775):

```php
    /**
     * #180/#186: the name candidates a source can be searched under,
     * resolved without any live BGG call - primary name from bgg_ranks
     * (the same dump-backed table the instant local answer already reads),
     * curated aliases from game_aliases (already a plain DB query, see
     * aliasNames()). Deliberately excludes the third tier searchNames()
     * adds (a German title guessed from BGG's live version data) - that
     * would require the full live lookup, defeating the point of this
     * method existing: letting the four name-based endpoints
     * (amazon.php/boardgamequest.php/hall9000.php/brettspielereport.php)
     * fire in true parallel with bgg.php instead of waiting on it first
     * (which would risk several endpoints racing to populate
     * bgg_lookup_cache simultaneously on a cold cache).
     *
     * @return string[] empty when the dump has no row for this id at all.
     */
    public function localSearchNames(int $bggId): array
    {
        $stmt = db()->prepare('SELECT name FROM bgg_ranks WHERE bgg_id = ?');
        $stmt->execute([$bggId]);
        $name = $stmt->fetchColumn();
        if ($name === false) {
            return [];
        }
        return array_values(array_unique(array_merge([(string) $name], $this->aliasNames($bggId))));
    }
```

- [ ] **Step 5: Run to verify it passes**

Same command as Step 3. Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
git add api/lib/BggClient.php api/tests/BggClientTest.php
git commit -m "Strip unit words from BGG's own duration/age, add localSearchNames() (#180/#186)"
```

---

## Task 4: Create `api/boardgames/amazon.php`

**Files:**
- Create: `api/boardgames/amazon.php`
- Test: Create `api/tests/AmazonEndpointTest.php`

**Interfaces:**
- Consumes: `BggClient::localSearchNames(int): string[]` (Task 3), `RatingSource.php`'s `first_hit(array $names, callable $fetch)` (unchanged, existing), `AmazonRatingClient::rating(string): ?array{value,max,count,title,url}`, `AmazonRatingClient::priceFor(string): ?array{price,currency,title,url}`.
- Produces: `GET /api/boardgames/amazon.php?bgg_id=<int>` → `{"status":"ok","rating":{"source":"Amazon.de",...}|null,"price":{"value":..,"currency":"EUR","source":"Amazon.de","url":..}|null}`.

Endpoint-level PHP files in this codebase are thin and untested directly (`local.php`, `top.php` have no dedicated test file - their logic lives in `BggClient` and is tested there). This endpoint's only *new* logic is the response assembly, so its test exercises that assembly against a fake `AmazonRatingClient`-shaped closure rather than hitting the real network - see Step 1.

- [ ] **Step 1: Write the failing test**

Create `api/tests/AmazonEndpointTest.php`:

```php
<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/AmazonRatingClient.php';
require_once __DIR__ . '/../lib/RatingSource.php';

// Exercises the assembly logic amazon.php contains, without going through
// an actual HTTP request - AmazonRatingClient itself is already tested in
// AmazonRatingClientTest.php.
final class AmazonEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgg_ranks');
        db()->exec('DELETE FROM game_aliases');
        db()->exec('DELETE FROM amazon_rating_cache');
        db()->exec("INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES (13, 'Catan', 1995, 7.1, 100, 0, 566)");
    }

    public function testReturnsBothRatingAndPriceForAKnownGame(): void
    {
        $names = (new BggClient(fn() => null))->localSearchNames(13);
        $amazon = new AmazonRatingClient(fn() => $this->searchHtml());

        $rating = first_hit($names, fn(string $n) => $amazon->rating($n));
        $price = first_hit($names, fn(string $n) => $amazon->priceFor($n));

        $this->assertSame('Amazon.de', $rating['title'] === null ? 'Amazon.de' : $rating['title']);
        $this->assertNotNull($rating);
        $this->assertNotNull($price);
        $this->assertSame(22.90, $price['price']);
    }

    public function testReturnsNullForBothWhenNothingMatches(): void
    {
        $names = (new BggClient(fn() => null))->localSearchNames(13);
        $amazon = new AmazonRatingClient(fn() => ['url' => 'x', 'body' => '<html><body>no results</body></html>']);

        $rating = first_hit($names, fn(string $n) => $amazon->rating($n));
        $price = first_hit($names, fn(string $n) => $amazon->priceFor($n));

        $this->assertNull($rating);
        $this->assertNull($price);
    }

    private function searchHtml(): array
    {
        $html = '<div data-component-type="s-search-result">'
            . '<h2><a href="/dp/B0DSWFN2XZ"><span>KOSMOS Catan - Das Spiel</span></a></h2>'
            . '<span class="a-icon-alt">4,7 von 5 Sternen</span>'
            . '<span class="a-size-base s-underline-text">257</span>'
            . '<span class="a-price"><span class="a-offscreen">22,90&nbsp;€</span></span>'
            . '</div>';
        return ['url' => 'https://www.amazon.de/s?k=catan', 'body' => $html];
    }
}
```

- [ ] **Step 2: Run it to confirm it passes already**

This test only exercises existing, already-tested pieces (`localSearchNames`, `first_hit`, `AmazonRatingClient`) wired together the way `amazon.php` will wire them - it should already be GREEN before `amazon.php` exists, since it never requires the endpoint file itself. This is intentional: it locks in the exact composition `amazon.php` must perform before writing the endpoint, so Step 4 below is a transcription, not new logic.

```bash
docker compose up -d --build php
docker compose exec -T -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test php sh -c 'cd api && ./vendor/bin/phpunit --filter AmazonEndpointTest'
```
Expected: `OK (2 tests, ...)`.

- [ ] **Step 3: Create the endpoint**

Create `api/boardgames/amazon.php`:

```php
<?php
// #180/#186: Amazon.de's own slice of the boardgame lookup - rating and
// price, one fetch serves both. Fired in parallel with bgg.php and the
// other four external endpoints; resolves its own search names locally
// (see BggClient::localSearchNames()) rather than waiting on bgg.php.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/AmazonRatingClient.php';
require_once __DIR__ . '/../lib/RatingSource.php';

$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;
if ($bggId === null) {
    error_response('bgg_id is required', 400);
}

try {
    $names = (new BggClient())->localSearchNames($bggId);
    if ($names === []) {
        json_response(['status' => 'ok', 'rating' => null, 'price' => null]);
    }

    $amazon = new AmazonRatingClient();

    $rating = null;
    try {
        $found = first_hit($names, fn(string $n) => $amazon->rating($n));
        $rating = $found === null ? null : ['source' => $amazon->label()] + $found;
    } catch (Throwable $e) {
        error_log('amazon.de rating failed: ' . $e->getMessage());
    }

    $price = null;
    try {
        $found = first_hit($names, fn(string $n) => $amazon->priceFor($n));
        $price = $found === null ? null : [
            'value' => $found['price'],
            'currency' => $found['currency'],
            'source' => $amazon->label(),
            'url' => $found['url'],
        ];
    } catch (Throwable $e) {
        error_log('amazon.de price failed: ' . $e->getMessage());
    }

    json_response(['status' => 'ok', 'rating' => $rating, 'price' => $price]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
```

- [ ] **Step 4: Manually verify against the running dev stack**

```bash
docker compose up -d --build php
curl -s "http://localhost:8081/api/boardgames/amazon.php?bgg_id=13"
```
Expected: `{"status":"ok","rating":{...},"price":{...}}` for Catan (bgg_id 13), matching what `sheoforge.de/api/boardgames/lookup.php?bgg_id=13`'s `ratings`/`prices` fields show for the Amazon entry today.

- [ ] **Step 5: Commit**

```bash
git add api/boardgames/amazon.php api/tests/AmazonEndpointTest.php
git commit -m "Add api/boardgames/amazon.php as its own parallel endpoint (#180/#186)"
```

---

## Task 5: Create `api/boardgames/boardgamequest.php`

**Files:**
- Create: `api/boardgames/boardgamequest.php`
- Test: Create `api/tests/BoardGameQuestEndpointTest.php`

**Interfaces:**
- Consumes: same `BggClient::localSearchNames()`/`first_hit()` as Task 4, `BoardGameQuestClient::rating(string): ?array`, `BoardGameQuestClient::reviewFor(string): ?array{score,rules,hits,misses,title,url}`.
- Produces: `GET /api/boardgames/boardgamequest.php?bgg_id=<int>` → `{"status":"ok","rating":{...}|null,"review":{"rules":..,"hits":[..],"misses":[..],"title":..,"url":..}|null}` (review omits `score` - the rating entry already carries it as `value`, no need to duplicate).

- [ ] **Step 1: Write the failing test**

Create `api/tests/BoardGameQuestEndpointTest.php`:

```php
<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/BoardGameQuestClient.php';
require_once __DIR__ . '/../lib/RatingSource.php';

final class BoardGameQuestEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgg_ranks');
        db()->exec('DELETE FROM game_aliases');
        db()->exec('DELETE FROM bgq_review_cache');
        db()->exec("INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES (13, 'Azul', 2017, 7.1, 100, 0, 99)");
    }

    public function testReturnsBothRatingAndReviewForAKnownGame(): void
    {
        $names = (new BggClient(fn() => null))->localSearchNames(13);
        $bgq = new BoardGameQuestClient(fn() => [$this->post()]);

        $rating = first_hit($names, fn(string $n) => $bgq->rating($n));
        $review = first_hit($names, fn(string $n) => $bgq->reviewFor($n));

        $this->assertSame(4.5, $rating['value']);
        $this->assertSame('Players draft coloured tiles.', $review['rules']);
    }

    private function post(): array
    {
        return [
            'link' => 'https://www.boardgamequest.com/azul-review/',
            'title' => ['rendered' => 'Azul Review'],
            'content' => ['rendered' => '<p>Gameplay Overview: Players draft coloured tiles. Final Score: 4.5 Stars</p>'],
        ];
    }
}
```

- [ ] **Step 2: Run it to confirm it already passes**

```bash
docker compose up -d --build php
docker compose exec -T -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test php sh -c 'cd api && ./vendor/bin/phpunit --filter BoardGameQuestEndpointTest'
```
Expected: `OK (1 test, ...)` - same reasoning as Task 4 Step 2.

- [ ] **Step 3: Create the endpoint**

Create `api/boardgames/boardgamequest.php`:

```php
<?php
// #180/#186: Board Game Quest's slice - How-it-plays text (with a link
// back to the full review), Hits/Misses (good/bad fallback, merged
// client-side against BGG's own comments), and their own rating.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/BoardGameQuestClient.php';
require_once __DIR__ . '/../lib/RatingSource.php';

$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;
if ($bggId === null) {
    error_response('bgg_id is required', 400);
}

try {
    $names = (new BggClient())->localSearchNames($bggId);
    if ($names === []) {
        json_response(['status' => 'ok', 'rating' => null, 'review' => null]);
    }

    $bgq = new BoardGameQuestClient();

    $rating = null;
    $review = null;
    try {
        // One reviewFor() covers both - rating() itself just wraps it, and
        // calling both here would be a second cache_aside on the exact same
        // key, harmless but pointless.
        $found = first_hit($names, fn(string $n) => $bgq->reviewFor($n));
        if ($found !== null) {
            $rating = [
                'source' => $bgq->label(),
                'value' => $found['score'],
                'max' => 5,
                'count' => null,
                'title' => $found['title'],
                'url' => $found['url'],
            ];
            $review = [
                'rules' => $found['rules'],
                'hits' => $found['hits'],
                'misses' => $found['misses'],
                'title' => $found['title'],
                'url' => $found['url'],
            ];
        }
    } catch (Throwable $e) {
        error_log('board game quest failed: ' . $e->getMessage());
    }

    json_response(['status' => 'ok', 'rating' => $rating, 'review' => $review]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
```

- [ ] **Step 4: Manually verify against the running dev stack**

```bash
curl -s "http://localhost:8081/api/boardgames/boardgamequest.php?bgg_id=454672"
```
Expected: `{"status":"ok","rating":{...},"review":{"rules":"Boss Fighters QR, published by Pegasus Spiele...","hits":[...],"misses":[...],...}}` - `rules` should end at a clean word boundary (Task 2/#178's fix, unaffected by this task).

- [ ] **Step 5: Commit**

```bash
git add api/boardgames/boardgamequest.php api/tests/BoardGameQuestEndpointTest.php
git commit -m "Add api/boardgames/boardgamequest.php as its own parallel endpoint (#180/#186)"
```

---

## Task 6: Create `api/boardgames/hall9000.php`

**Files:**
- Create: `api/boardgames/hall9000.php`
- Test: Create `api/tests/Hall9000EndpointTest.php`

**Interfaces:**
- Consumes: `BggClient::localSearchNames()`/`first_hit()`, `Hall9000Client::rating(string): ?array`, `Hall9000Client::ratingFor(string): ?array` (Task 2's raw-number shape).
- Produces: `GET /api/boardgames/hall9000.php?bgg_id=<int>` → `{"status":"ok","rating":{...}|null,"players":string|null,"duration":string|null,"age":int|null}`.

- [ ] **Step 1: Write the failing test**

Create `api/tests/Hall9000EndpointTest.php`:

```php
<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/Hall9000Client.php';
require_once __DIR__ . '/../lib/RatingSource.php';

final class Hall9000EndpointTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgg_ranks');
        db()->exec('DELETE FROM game_aliases');
        db()->exec('DELETE FROM hall9000_cache');
        db()->exec("INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES (13, 'Azul', 2017, 7.1, 100, 0, 99)");
    }

    public function testReturnsRatingAndFactsForAKnownGame(): void
    {
        $names = (new BggClient(fn() => null))->localSearchNames(13);
        $hall = new Hall9000Client(fn() => [
            'url' => 'x',
            'body' => '<p>H@LL9000 Wertung Azul: 4,8, 17 Bewertung(en) Spieler: 2 - 4 Dauer: 30 - 45 Minuten Alter: ab 8 Jahren Jahr: 2017</p>',
        ]);

        $rating = first_hit($names, fn(string $n) => $hall->rating($n));
        $facts = first_hit($names, fn(string $n) => $hall->ratingFor($n));

        $this->assertSame(4.8, $rating['value']);
        $this->assertSame('30 - 45', $facts['duration']);
        $this->assertSame(8, $facts['age']);
    }
}
```

- [ ] **Step 2: Run it to confirm it already passes**

```bash
docker compose up -d --build php
docker compose exec -T -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test php sh -c 'cd api && ./vendor/bin/phpunit --filter Hall9000EndpointTest'
```
Expected: `OK (1 test, ...)`.

- [ ] **Step 3: Create the endpoint**

Create `api/boardgames/hall9000.php`:

```php
<?php
// #180/#186: H@LL9000's slice - facts (players/duration/age, unit-free
// numbers, see Hall9000Client::numericPrefix()) and their own rating.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/Hall9000Client.php';
require_once __DIR__ . '/../lib/RatingSource.php';

$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;
if ($bggId === null) {
    error_response('bgg_id is required', 400);
}

try {
    $names = (new BggClient())->localSearchNames($bggId);
    if ($names === []) {
        json_response(['status' => 'ok', 'rating' => null, 'players' => null, 'duration' => null, 'age' => null]);
    }

    $hall = new Hall9000Client();

    $rating = null;
    $players = null;
    $duration = null;
    $age = null;
    try {
        $found = first_hit($names, fn(string $n) => $hall->ratingFor($n));
        if ($found !== null) {
            $rating = [
                'source' => $hall->label(),
                'value' => $found['rating'],
                'max' => $found['max'],
                'count' => $found['count'],
                'title' => null,
                'url' => $found['url'],
            ];
            $players = $found['players'];
            $duration = $found['duration'];
            $age = $found['age'];
        }
    } catch (Throwable $e) {
        error_log('hall9000 failed: ' . $e->getMessage());
    }

    json_response(['status' => 'ok', 'rating' => $rating, 'players' => $players, 'duration' => $duration, 'age' => $age]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
```

- [ ] **Step 4: Manually verify against the running dev stack**

```bash
curl -s "http://localhost:8081/api/boardgames/hall9000.php?bgg_id=13"
```
Expected: `{"status":"ok","rating":{...},"players":"3 - 4","duration":"...","age":...}` with no unit words in `duration`/`age`.

- [ ] **Step 5: Commit**

```bash
git add api/boardgames/hall9000.php api/tests/Hall9000EndpointTest.php
git commit -m "Add api/boardgames/hall9000.php as its own parallel endpoint (#180/#186)"
```

---

## Task 7: Create `api/boardgames/brettspielereport.php`

**Files:**
- Create: `api/boardgames/brettspielereport.php`
- Test: Create `api/tests/BrettspieleReportEndpointTest.php`

**Interfaces:**
- Consumes: `BggClient::localSearchNames()`/`first_hit()`, `BrettspieleReportClient::rating(string): ?array`, `BrettspieleReportClient::ratingFor(string): ?array{rating,max,complexity,title,url}`.
- Produces: `GET /api/boardgames/brettspielereport.php?bgg_id=<int>` → `{"status":"ok","rating":{...}|null,"complexity":{"value":n,"max":20,"source":"brettspiele-report"}|null}`.

- [ ] **Step 1: Write the failing test**

Create `api/tests/BrettspieleReportEndpointTest.php`:

```php
<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/BrettspieleReportClient.php';
require_once __DIR__ . '/../lib/RatingSource.php';

final class BrettspieleReportEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgg_ranks');
        db()->exec('DELETE FROM game_aliases');
        db()->exec('DELETE FROM brettspiele_report_cache');
        db()->exec("INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES (13, 'Azul', 2017, 7.1, 100, 0, 99)");
    }

    public function testReturnsRatingAndComplexityForAKnownGame(): void
    {
        $names = (new BggClient(fn() => null))->localSearchNames(13);
        $client = new BrettspieleReportClient(fn() => [$this->post()]);

        $rating = first_hit($names, fn(string $n) => $client->rating($n));
        $facts = first_hit($names, fn(string $n) => $client->ratingFor($n));

        $this->assertSame(14, $rating['value']);
        $this->assertSame(9, $facts['complexity']);
    }

    private function post(): array
    {
        return [
            'link' => 'https://www.brettspiele-report.de/azul-review/',
            'title' => ['rendered' => 'Azul'],
            'content' => ['rendered' => '<p>Komplexität: 9 Bewertung: 14</p>'],
        ];
    }
}
```

- [ ] **Step 2: Run it to confirm it already passes**

```bash
docker compose up -d --build php
docker compose exec -T -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test php sh -c 'cd api && ./vendor/bin/phpunit --filter BrettspieleReportEndpointTest'
```
Expected: `OK (1 test, ...)`.

- [ ] **Step 3: Create the endpoint**

Create `api/boardgames/brettspielereport.php`:

```php
<?php
// #180/#186: brettspiele-report's slice - their own rating and, when
// present, the Komplexität category score.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';
require_once __DIR__ . '/../lib/BrettspieleReportClient.php';
require_once __DIR__ . '/../lib/RatingSource.php';

$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;
if ($bggId === null) {
    error_response('bgg_id is required', 400);
}

try {
    $names = (new BggClient())->localSearchNames($bggId);
    if ($names === []) {
        json_response(['status' => 'ok', 'rating' => null, 'complexity' => null]);
    }

    $client = new BrettspieleReportClient();

    $rating = null;
    $complexity = null;
    try {
        $found = first_hit($names, fn(string $n) => $client->ratingFor($n));
        if ($found !== null) {
            $rating = [
                'source' => $client->label(),
                'value' => $found['rating'],
                'max' => $found['max'],
                'count' => null,
                'title' => $found['title'],
                'url' => $found['url'],
            ];
            $complexity = $found['complexity'] === null ? null : [
                'value' => $found['complexity'],
                'max' => BrettspieleReportClient::MAX_RATING,
                'source' => $client->label(),
            ];
        }
    } catch (Throwable $e) {
        error_log('brettspiele-report failed: ' . $e->getMessage());
    }

    json_response(['status' => 'ok', 'rating' => $rating, 'complexity' => $complexity]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
```

- [ ] **Step 4: Manually verify against the running dev stack**

```bash
curl -s "http://localhost:8081/api/boardgames/brettspielereport.php?bgg_id=13"
```

- [ ] **Step 5: Commit**

```bash
git add api/boardgames/brettspielereport.php api/tests/BrettspieleReportEndpointTest.php
git commit -m "Add api/boardgames/brettspielereport.php as its own parallel endpoint (#180/#186)"
```

---

## Task 8: Create `api/boardgames/brettspielpreise.php`

**Files:**
- Create: `api/boardgames/brettspielpreise.php`
- Test: Create `api/tests/BrettspielpreiseEndpointTest.php`

**Interfaces:**
- Consumes: `BrettspielpreiseClient::priceFor(int $bggId): ?array{price,currency,title,url}` - no name resolution needed, keyed by `bgg_id` directly.
- Produces: `GET /api/boardgames/brettspielpreise.php?bgg_id=<int>` → `{"status":"ok","price":{"value":..,"currency":"EUR","source":"Brettspielpreise.de","url":..}|null}`.

- [ ] **Step 1: Write the failing test**

Create `api/tests/BrettspielpreiseEndpointTest.php`:

```php
<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BrettspielpreiseClient.php';

final class BrettspielpreiseEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM brettspielpreise_cache');
    }

    public function testShapesThePriceWithTheClientsOwnLabel(): void
    {
        $client = new BrettspielpreiseClient(fn() => [
            'currency' => 'EUR',
            'items' => [['name' => 'Ark Nova', 'url' => null, 'prices' => [
                ['price' => 55.17, 'link' => 'https://brettspielpreise.de/item/go?storeitemid=1', 'stock' => 'Y', 'country' => 'DE'],
            ]]],
        ]);

        $found = $client->priceFor(342942);
        $price = $found === null ? null : [
            'value' => $found['price'],
            'currency' => $found['currency'],
            'source' => $client->label(),
            'url' => $found['url'],
        ];

        $this->assertSame([
            'value' => 55.17,
            'currency' => 'EUR',
            'source' => 'Brettspielpreise.de',
            'url' => 'https://brettspielpreise.de/item/go?storeitemid=1',
        ], $price);
    }
}
```

- [ ] **Step 2: Run it to confirm it already passes**

```bash
docker compose up -d --build php
docker compose exec -T -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test php sh -c 'cd api && ./vendor/bin/phpunit --filter BrettspielpreiseEndpointTest'
```
Expected: `OK (1 test, ...)`.

- [ ] **Step 3: Create the endpoint**

Create `api/boardgames/brettspielpreise.php`:

```php
<?php
// #180/#186: Brettspielpreise.de's slice - the retail price, keyed
// directly by BGG id, no title matching or name resolution needed.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BrettspielpreiseClient.php';

$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;
if ($bggId === null) {
    error_response('bgg_id is required', 400);
}

try {
    $client = new BrettspielpreiseClient();

    $price = null;
    try {
        $found = $client->priceFor($bggId);
        $price = $found === null ? null : [
            'value' => $found['price'],
            'currency' => $found['currency'],
            'source' => $client->label(),
            'url' => $found['url'],
        ];
    } catch (Throwable $e) {
        error_log('brettspielpreise.de failed: ' . $e->getMessage());
    }

    json_response(['status' => 'ok', 'price' => $price]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
```

- [ ] **Step 4: Manually verify against the running dev stack**

```bash
curl -s "http://localhost:8081/api/boardgames/brettspielpreise.php?bgg_id=13"
```

- [ ] **Step 5: Commit**

```bash
git add api/boardgames/brettspielpreise.php api/tests/BrettspielpreiseEndpointTest.php
git commit -m "Add api/boardgames/brettspielpreise.php as its own parallel endpoint (#180/#186)"
```

---

## Task 9: Slim `lookup.php` into `bgg.php`, remove now-dead collection helpers

**Files:**
- Create: `api/boardgames/bgg.php`
- Delete: `api/boardgames/lookup.php`, `api/lib/PriceSource.php`, `api/tests/PriceSourceTest.php`
- Modify: `api/lib/RatingSource.php` (remove `collect_ratings()`, keep `first_hit()` and the `RatingSource` interface)
- Modify: `api/tests/RatingSourceTest.php` (retarget at `first_hit()` directly)

**Interfaces:**
- Consumes: `BggClient::lookup(int): ?array`, `BggClient::preferredName()`, `BggClient::preferredDescription()` (all unchanged).
- Produces: `GET /api/boardgames/bgg.php?bgg_id=<int>&lang=<de|en>` → the same shape `lookup.php` returned MINUS `ratings`, `bgq`, `prices` (those now live on the five other endpoints). `GET /api/boardgames/bgg.php?q=<name>` still supports search-by-name, `disambiguation`, and `not_found` exactly as `lookup.php` did.

`RatingSource.php`'s `collect_ratings()` batched multiple *sources* into one list - with one source per endpoint now, nothing calls it. `first_hit()` (tries multiple *name candidates* against one source) stays essential and is used by Tasks 4-7 above. `PriceSource.php`'s only export, `collect_prices()`, has the same fate - `amazon.php`/`brettspielpreise.php` each format their own single price directly (Tasks 4 and 8), so the whole file is now dead.

- [ ] **Step 1: Retarget `RatingSourceTest.php` at `first_hit()` and watch it fail**

Replace the entire contents of `api/tests/RatingSourceTest.php` with:

```php
<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/RatingSource.php';

// #180/#186: collect_ratings() batched multiple external sources into one
// list - dead now that lookup.php's work is split one source per endpoint
// (see bgg.php/amazon.php/boardgamequest.php/hall9000.php/
// brettspielereport.php). first_hit() (tries multiple name candidates
// against ONE source) stays essential and every one of those endpoints
// uses it, so its behavior is still covered here directly.
final class RatingSourceTest extends TestCase
{
    // #122: the four secondary sources are German, BGG's primary name is
    // English, so Catan was searched for as "Catan" and found nowhere.
    public function testTriesTheGermanNameWhenTheEnglishOneFindsNothing(): void
    {
        $asked = [];
        $found = first_hit(['Catan', 'Die Siedler von Catan'], function (string $name) use (&$asked) {
            $asked[] = $name;
            return $name === 'Die Siedler von Catan' ? ['value' => 5.4] : null;
        });

        $this->assertSame(['value' => 5.4], $found);
        $this->assertSame(['Catan', 'Die Siedler von Catan'], $asked);
    }

    public function testStopsAtTheFirstNameThatAnswers(): void
    {
        $asked = [];
        first_hit(['Wingspan', 'Flugelschlag'], function (string $name) use (&$asked) {
            $asked[] = $name;
            return ['value' => 4.6];
        });

        $this->assertSame(['Wingspan'], $asked, 'a name that already answered must not spend a second request on a guess it does not need');
    }

    // A source that is down has not said "nothing published under this
    // name", so the remaining names must not be spent papering over it.
    public function testAFailingCallIsNotRetriedUnderAnotherName(): void
    {
        $asked = [];
        try {
            first_hit(['Catan', 'Die Siedler von Catan'], function (string $name) use (&$asked) {
                $asked[] = $name;
                throw new RuntimeException('upstream is down');
            });
            $this->fail('expected the exception to propagate');
        } catch (RuntimeException $e) {
            $this->assertSame(['Catan'], $asked);
        }
    }

    public function testReturnsNullWhenNoNameAnswers(): void
    {
        $this->assertNull(first_hit(['Catan', 'Die Siedler von Catan'], fn() => null));
    }
}
```

Delete `api/tests/PriceSourceTest.php` entirely (`git rm`).

- [ ] **Step 2: Run to verify the retargeted test passes and the deleted one is gone**

```bash
docker compose up -d --build php
docker compose exec -T -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test php sh -c 'cd api && ./vendor/bin/phpunit --filter "RatingSourceTest"'
```
Expected: `OK (4 tests, ...)`. This passes without touching `RatingSource.php` yet, because `first_hit()` already exists unchanged - the point of this step is confirming the new test file is correct on its own before the deletion in Step 3 removes `collect_ratings()`.

- [ ] **Step 3: Remove the dead functions**

In `api/lib/RatingSource.php`, delete the `collect_ratings()` function (keep the `RatingSource` interface and `first_hit()`). Delete `api/lib/PriceSource.php` entirely (`git rm`).

Run the full suite to confirm nothing else referenced `collect_ratings()`/`collect_prices()`:
```bash
docker compose up -d --build php
docker compose exec -T -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test php sh -c 'cd api && ./vendor/bin/phpunit'
```
Expected: `OK` - if this fails with "Call to undefined function collect_ratings()"/"collect_prices()", grep the codebase for remaining callers before proceeding (there should be none outside the just-deleted/just-replaced files and the not-yet-written `bgg.php`).

- [ ] **Step 4: Create `bgg.php`**

Create `api/boardgames/bgg.php` (this replaces `lookup.php` - same request/response contract for the fields it keeps, `ratings`/`bgq`/`prices` removed):

```php
<?php
// #180/#186: BGG's own slice of the boardgame lookup - name, description,
// image, facts, categories, BGG's own rating/rank, good/bad. The only
// endpoint of the six that can fail the whole card (404/502) - the other
// five are Best-Effort and always answer 200. Fired in parallel with them;
// does not wait on or block any of them.
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/BggClient.php';

$q = trim($_GET['q'] ?? '');
$bggIdParam = $_GET['bgg_id'] ?? '';
$bggId = ctype_digit((string) $bggIdParam) ? (int) $bggIdParam : null;

if ($q === '' && $bggId === null) {
    error_response('q or bgg_id is required', 400);
}
// #130: only 'de' is ever meaningful today - anything else (missing, 'en',
// garbage) is today's existing behaviour, BGG's own primary name.
$lang = ($_GET['lang'] ?? '') === 'de' ? 'de' : null;

try {
    $client = new BggClient();

    if ($bggId === null) {
        $resolved = $client->resolveSearch($q);
        if ($resolved['status'] === 'not_found') {
            json_response([
                'status' => 'not_found',
                'query' => $q,
                'suggestions' => $client->didYouMean($q, 5, $lang),
            ]);
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
    if ($lang !== null) {
        $game['name'] = $client->preferredName($bggId, $lang) ?? $game['name'];
    }
    $game['descriptionTranslated'] = false;
    if ($lang !== null) {
        $translated = $client->preferredDescription($bggId, $lang);
        if ($translated !== null) {
            $game['description'] = $translated;
            $game['descriptionTranslated'] = true;
        }
    }
    // Search-only, never a field this API has published.
    unset($game['germanNames']);

    json_response(['status' => 'ok', 'game' => $game]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    error_response('Something went wrong looking up that board game.', 502);
}
```

Delete `api/boardgames/lookup.php` (`git rm`).

- [ ] **Step 5: Manually verify against the running dev stack**

```bash
docker compose up -d --build php
curl -s "http://localhost:8081/api/boardgames/bgg.php?bgg_id=13&lang=de"
```
Expected: same shape as today's `lookup.php` response for Catan, but with no `ratings`, `bgq`, or `prices` keys.

- [ ] **Step 6: Run the full backend suite**

```bash
docker compose exec -T -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test php sh -c 'cd api && ./vendor/bin/phpunit'
```
Expected: `OK`, no failures.

- [ ] **Step 7: Commit**

```bash
git add api/boardgames/bgg.php api/lib/RatingSource.php api/tests/RatingSourceTest.php
git rm api/boardgames/lookup.php api/lib/PriceSource.php api/tests/PriceSourceTest.php
git commit -m "Slim lookup.php into bgg.php, remove now-dead collect_ratings/collect_prices (#180/#186)"
```

---

## Task 10: Frontend API layer - types and fetch functions for the six endpoints

**Files:**
- Modify: `frontend/src/features/boardgames/api.ts`

**Interfaces:**
- Consumes: existing `apiFetch` (`frontend/src/lib/apiClient.ts`), existing `ExternalRating`, `RetailPrice`, `BoardGameQuestReview`, `Complexity`, `BoardgameCandidate`, `BoardgameSource`, `BggTag` types (all unchanged).
- Produces:
  - `BggCoreResult` type + `type BggResult = {status:"ok";game:BggCoreResult} | {status:"disambiguation";candidates:BoardgameCandidate[]} | {status:"not_found";query:string;suggestions:BoardgameCandidate[]}`
  - `fetchBggById(bggId: number, lang?: Lang): Promise<BggResult>`
  - `fetchBggByQuery(query: string, lang?: Lang): Promise<BggResult>`
  - `AmazonResult`, `fetchAmazon(bggId: number): Promise<AmazonResult>`
  - `BoardGameQuestResult`, `fetchBoardGameQuest(bggId: number): Promise<BoardGameQuestResult>`
  - `Hall9000Result`, `fetchHall9000(bggId: number): Promise<Hall9000Result>`
  - `BrettspieleReportResult`, `fetchBrettspieleReport(bggId: number): Promise<BrettspieleReportResult>`
  - `fetchBrettspielpreise(bggId: number): Promise<RetailPrice | null>`

No test file for this task alone - `apiFetch`-wrapping functions in this file have never had dedicated tests (see `lookupBoardgame`/`topBoardgames` etc. above them); they're exercised through `BoardgameLookupPage.test.tsx`'s mocks in Task 12.

- [ ] **Step 1: Add the new types and functions**

In `frontend/src/features/boardgames/api.ts`, add after the existing `Boardgame` interface (after line 153, before `BoardgameLookupResult`):

```typescript
/**
 * #180/#186: bgg.php's shape - BGG's own data only. No `ratings`, `bgq`,
 * or `prices` - those are assembled client-side from the five other
 * endpoints (see mergeSources.ts). `players`/`duration`/`age` are raw,
 * unit-free numbers/ranges here (BGG's own facts, still possibly filled
 * in further by hall9000.php per-field) - the merge step is what turns
 * them into the labeled `Boardgame.players`/`duration`/`age` strings.
 */
export interface BggCoreResult {
  bggId: number;
  name: string;
  description: string;
  descriptionTranslated?: boolean;
  rating: number | null;
  numRatings: number | null;
  good: string[] | null;
  bad: string[] | null;
  partial: boolean;
  players: string | null;
  duration: string | null;
  age: number | null;
  complexity: Complexity | null;
  isExpansion: boolean;
  rank: number | null;
  thumbnail?: string | null;
  image?: string | null;
  mechanics?: BggTag[];
  categories?: BggTag[];
  interaction?: "competitive" | "cooperative" | "one-vs-all" | null;
  strategyRank?: number | null;
  familyRank?: number | null;
  thematicRank?: number | null;
  source: BoardgameSource;
}

export type BggResult =
  | { status: "ok"; game: BggCoreResult }
  | { status: "disambiguation"; candidates: BoardgameCandidate[] }
  | { status: "not_found"; query: string; suggestions: BoardgameCandidate[] };

export function fetchBggById(bggId: number, lang?: Lang): Promise<BggResult> {
  const params = withLang({ bgg_id: String(bggId) }, lang);
  return apiFetch<BggResult>(`/api/boardgames/bgg?${params.toString()}`);
}

export function fetchBggByQuery(query: string, lang?: Lang): Promise<BggResult> {
  const params = withLang({ q: query }, lang);
  return apiFetch<BggResult>(`/api/boardgames/bgg?${params.toString()}`);
}

export interface AmazonResult {
  rating: ExternalRating | null;
  price: RetailPrice | null;
}

export function fetchAmazon(bggId: number): Promise<AmazonResult> {
  return apiFetch<{ status: "ok" } & AmazonResult>(`/api/boardgames/amazon?bgg_id=${bggId}`);
}

export interface BoardGameQuestResult {
  rating: ExternalRating | null;
  review: Omit<BoardGameQuestReview, "score"> | null;
}

export function fetchBoardGameQuest(bggId: number): Promise<BoardGameQuestResult> {
  return apiFetch<{ status: "ok" } & BoardGameQuestResult>(`/api/boardgames/boardgamequest?bgg_id=${bggId}`);
}

export interface Hall9000Result {
  rating: ExternalRating | null;
  players: string | null;
  duration: string | null;
  age: number | null;
}

export function fetchHall9000(bggId: number): Promise<Hall9000Result> {
  return apiFetch<{ status: "ok" } & Hall9000Result>(`/api/boardgames/hall9000?bgg_id=${bggId}`);
}

export interface BrettspieleReportResult {
  rating: ExternalRating | null;
  complexity: Complexity | null;
}

export function fetchBrettspieleReport(bggId: number): Promise<BrettspieleReportResult> {
  return apiFetch<{ status: "ok" } & BrettspieleReportResult>(`/api/boardgames/brettspielereport?bgg_id=${bggId}`);
}

export function fetchBrettspielpreise(bggId: number): Promise<RetailPrice | null> {
  return apiFetch<{ status: "ok"; price: RetailPrice | null }>(`/api/boardgames/brettspielpreise?bgg_id=${bggId}`).then(
    (res) => res.price
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors (this task only adds new exports, nothing consumes them yet).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/boardgames/api.ts
git commit -m "Add frontend API types/functions for the six parallel boardgame endpoints (#180/#186)"
```

---

## Task 11: The merge function - `mergeSources.ts`

**Files:**
- Create: `frontend/src/features/boardgames/mergeSources.ts`
- Test: Create `frontend/src/features/boardgames/mergeSources.test.ts`

**Interfaces:**
- Consumes: `BggCoreResult`, `AmazonResult`, `BoardGameQuestResult`, `Hall9000Result`, `RetailPrice`, `ExternalRating`, `Boardgame`, `Lang` (Task 10).
- Produces:
  ```typescript
  export type SourceState<T> = { status: "pending" } | { status: "done"; value: T };

  export interface Sources {
    bgg: SourceState<BggCoreResult>;
    amazon: SourceState<AmazonResult>;
    boardgamequest: SourceState<BoardGameQuestResult>;
    hall9000: SourceState<Hall9000Result>;
    brettspielereport: SourceState<BrettspieleReportResult>;
    brettspielpreise: SourceState<RetailPrice | null>;
  }

  export function initialSources(): Sources; // all six "pending"
  export function mergeSources(local: Boardgame, sources: Sources, lang: Lang): Boardgame;
  ```

This is the riskiest logic in the whole change (six independent arrival orders, the good/bad-waits-for-bgg rule, the per-field facts fallback), so it is isolated in its own file and tested directly with no React/fetch involved at all - exactly the "design for isolation and clarity" the spec called for.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/features/boardgames/mergeSources.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { initialSources, mergeSources, type Sources } from "./mergeSources";
import type { Boardgame } from "./api";

const LOCAL: Boardgame = {
  bggId: 13,
  name: "Catan",
  description: "",
  rating: 7.1,
  numRatings: 100,
  good: null,
  bad: null,
  partial: true,
  ratings: [],
  bgq: null,
  players: null,
  duration: null,
  age: null,
  complexity: null,
  prices: [],
  isExpansion: false,
  rank: 566,
  source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
};

function bggDone(overrides: Partial<import("./api").BggCoreResult> = {}) {
  return {
    status: "done" as const,
    value: {
      bggId: 13,
      name: "Catan",
      description: "Trade, build, settle.",
      rating: 7.1,
      numRatings: 100,
      good: null,
      bad: null,
      partial: false,
      players: "3 - 4",
      duration: "75",
      age: 10,
      complexity: null,
      isExpansion: false,
      rank: 566,
      source: { name: "BoardGameGeek", url: "https://boardgamegeek.com/boardgame/13" },
      ...overrides,
    },
  };
}

describe("mergeSources", () => {
  it("returns the local answer unchanged while every source is still pending", () => {
    const result = mergeSources(LOCAL, initialSources(), "en");
    expect(result).toEqual(LOCAL);
  });

  it("labels BGG's facts in English or German depending on lang, once bgg resolves", () => {
    const sources: Sources = { ...initialSources(), bgg: bggDone() };

    expect(mergeSources(LOCAL, sources, "en").duration).toBe("75 minutes");
    expect(mergeSources(LOCAL, sources, "de").duration).toBe("75 Minuten");
    expect(mergeSources(LOCAL, sources, "en").age).toBe("ages 10+");
    expect(mergeSources(LOCAL, sources, "de").age).toBe("ab 10 Jahren");
    expect(mergeSources(LOCAL, sources, "en").players).toBe("3 - 4 players");
  });

  it("fills only the individual facts field bgg is missing from hall9000, never a field bgg already has", () => {
    const sources: Sources = {
      ...initialSources(),
      bgg: bggDone({ duration: null }), // bgg has no duration for this game
      hall9000: {
        status: "done",
        value: { rating: null, players: "5 - 6", duration: "90", age: 12 },
      },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.duration).toBe("90 minutes"); // filled in from hall9000
    expect(result.players).toBe("3 - 4 players"); // bgg's own, hall9000's ignored
    expect(result.age).toBe("ages 10+"); // bgg's own, hall9000's ignored
  });

  it("uses board game quest's hits/misses as a good/bad fallback only once bgg has resolved with none of its own", () => {
    const sources: Sources = {
      ...initialSources(),
      bgg: bggDone({ good: null, bad: null }),
      boardgamequest: {
        status: "done",
        value: {
          rating: null,
          review: { rules: "How it plays.", hits: ["fun"], misses: ["long"], title: "Catan Review", url: "https://x" },
        },
      },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.good).toEqual(["fun"]);
    expect(result.bad).toEqual(["long"]);
  });

  it("does not apply board game quest's good/bad fallback while bgg is still pending", () => {
    const sources: Sources = {
      ...initialSources(),
      boardgamequest: {
        status: "done",
        value: {
          rating: null,
          review: { rules: "How it plays.", hits: ["fun"], misses: ["long"], title: "Catan Review", url: "https://x" },
        },
      },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.good).toBeNull();
    expect(result.bad).toBeNull();
  });

  it("never overrides bgg's own good/bad with board game quest's, even once both have resolved", () => {
    const sources: Sources = {
      ...initialSources(),
      bgg: bggDone({ good: ["bgg good"], bad: ["bgg bad"] }),
      boardgamequest: {
        status: "done",
        value: {
          rating: null,
          review: { rules: "x", hits: ["bgq good"], misses: ["bgq bad"], title: "t", url: "u" },
        },
      },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.good).toEqual(["bgg good"]);
    expect(result.bad).toEqual(["bgg bad"]);
  });

  it("shows board game quest's How-it-plays review regardless of bgg's state", () => {
    const sources: Sources = {
      ...initialSources(),
      boardgamequest: {
        status: "done",
        value: {
          rating: { source: "Board Game Quest", value: 4.5, max: 5, count: null, title: "t", url: "u" },
          review: { rules: "How it plays.", hits: [], misses: [], title: "t", url: "u" },
        },
      },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.bgq).toEqual({ score: 4.5, rules: "How it plays.", hits: [], misses: [], title: "t", url: "u" });
  });

  it("collects a rating entry from every source that resolved with one, in a fixed source order", () => {
    const sources: Sources = {
      ...initialSources(),
      brettspielereport: {
        status: "done",
        value: { rating: { source: "brettspiele-report", value: 14, max: 20, count: null, title: "t", url: "u2" }, complexity: null },
      },
      amazon: {
        status: "done",
        value: { rating: { source: "Amazon.de", value: 4.8, max: 5, count: 100, title: "t", url: "u1" }, price: null },
      },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.ratings.map((r) => r.source)).toEqual(["Amazon.de", "brettspiele-report"]);
  });

  it("collects a price entry from every source that resolved with one", () => {
    const sources: Sources = {
      ...initialSources(),
      brettspielpreise: { status: "done", value: { value: 55.17, currency: "EUR", source: "Brettspielpreise.de", url: "u1" } },
      amazon: { status: "done", value: { rating: null, price: { value: 22.9, currency: "EUR", source: "Amazon.de", url: "u2" } } },
    };

    const result = mergeSources(LOCAL, sources, "en");

    expect(result.prices).toEqual([
      { value: 55.17, currency: "EUR", source: "Brettspielpreise.de", url: "u1" },
      { value: 22.9, currency: "EUR", source: "Amazon.de", url: "u2" },
    ]);
  });

  it("prefers brettspiele-report's complexity over bgg's own once both resolved, same as today", () => {
    const sources: Sources = {
      ...initialSources(),
      bgg: bggDone({ complexity: { value: 2.8, max: 5, source: "BoardGameGeek" } }),
      brettspielereport: {
        status: "done",
        value: { rating: null, complexity: { value: 9, max: 20, source: "brettspiele-report" } },
      },
    };

    expect(mergeSources(LOCAL, sources, "en").complexity).toEqual({ value: 9, max: 20, source: "brettspiele-report" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd frontend && npx vitest run src/features/boardgames/mergeSources.test.ts
```
Expected: FAIL - `Cannot find module './mergeSources'`.

- [ ] **Step 3: Implement**

Create `frontend/src/features/boardgames/mergeSources.ts`:

```typescript
import type {
  AmazonResult,
  BggCoreResult,
  Boardgame,
  BoardGameQuestResult,
  BrettspieleReportResult,
  Complexity,
  ExternalRating,
  Hall9000Result,
  Lang,
  RetailPrice,
} from "./api";

export type SourceState<T> = { status: "pending" } | { status: "done"; value: T };

export interface Sources {
  bgg: SourceState<BggCoreResult>;
  amazon: SourceState<AmazonResult>;
  boardgamequest: SourceState<BoardGameQuestResult>;
  hall9000: SourceState<Hall9000Result>;
  brettspielereport: SourceState<BrettspieleReportResult>;
  brettspielpreise: SourceState<RetailPrice | null>;
}

export function initialSources(): Sources {
  return {
    bgg: { status: "pending" },
    amazon: { status: "pending" },
    boardgamequest: { status: "pending" },
    hall9000: { status: "pending" },
    brettspielereport: { status: "pending" },
    brettspielpreise: { status: "pending" },
  };
}

function done<T>(state: SourceState<T>): T | null {
  return state.status === "done" ? state.value : null;
}

// #180/#186: BGG's own facts carry no unit word ("2 - 4", "75", "10") -
// this is the one place that turns them into a labeled display string,
// so every source speaks the same unit-free language upstream of here
// and the label always matches the page's current DE/EN toggle.
function labelPlayers(value: string, lang: Lang): string {
  return lang === "de" ? `${value} Spieler` : `${value} players`;
}
function labelDuration(value: string, lang: Lang): string {
  return lang === "de" ? `${value} Minuten` : `${value} minutes`;
}
function labelAge(value: number, lang: Lang): string {
  return lang === "de" ? `ab ${value} Jahren` : `ages ${value}+`;
}

/**
 * Recomputed from scratch on every source arrival rather than patched
 * incrementally - simpler to reason about and test than tracking which
 * fields have already been merged.
 */
export function mergeSources(local: Boardgame, sources: Sources, lang: Lang): Boardgame {
  const bgg = done(sources.bgg);
  const amazon = done(sources.amazon);
  const boardgamequest = done(sources.boardgamequest);
  const hall9000 = done(sources.hall9000);
  const brettspielereport = done(sources.brettspielereport);
  const brettspielpreise = done(sources.brettspielpreise);

  const base: Boardgame = bgg === null ? local : { ...local, ...bgg, ratings: local.ratings, prices: local.prices };

  // Facts: bgg's own value wins per field; hall9000 only fills a field
  // bgg did not have at all, never replaces one it did.
  const rawPlayers = bgg?.players ?? hall9000?.players ?? null;
  const rawDuration = bgg?.duration ?? hall9000?.duration ?? null;
  const rawAge = bgg?.age ?? hall9000?.age ?? null;

  // good/bad: waits for bgg specifically, so board game quest's fallback
  // never flashes in and then gets replaced once bgg's own answer lands.
  let good = base.good;
  let bad = base.bad;
  if (bgg !== null) {
    good = bgg.good ?? (boardgamequest?.review?.hits.length ? boardgamequest.review.hits : null);
    bad = bgg.bad ?? (boardgamequest?.review?.misses.length ? boardgamequest.review.misses : null);
  }

  // Complexity: brettspiele-report's own value wins over bgg's fallback,
  // same direction lookup.php used before this split.
  const complexity: Complexity | null = brettspielereport?.complexity ?? bgg?.complexity ?? local.complexity;

  const ratings: ExternalRating[] = [amazon?.rating, boardgamequest?.rating, hall9000?.rating, brettspielereport?.rating].filter(
    (r): r is ExternalRating => r !== null && r !== undefined
  );

  const prices: RetailPrice[] = [brettspielpreise, amazon?.price].filter(
    (p): p is RetailPrice => p !== null && p !== undefined
  );

  return {
    ...base,
    players: rawPlayers === null ? null : labelPlayers(rawPlayers, lang),
    duration: rawDuration === null ? null : labelDuration(rawDuration, lang),
    age: rawAge === null ? null : labelAge(rawAge, lang),
    good,
    bad,
    complexity,
    bgq:
      boardgamequest?.review === null || boardgamequest?.review === undefined
        ? null
        : { ...boardgamequest.review, score: boardgamequest.rating?.value ?? 0 },
    ratings,
    prices,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd frontend && npx vitest run src/features/boardgames/mergeSources.test.ts
```
Expected: `PASS`, all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/boardgames/mergeSources.ts frontend/src/features/boardgames/mergeSources.test.ts
git commit -m "Add the source-merge function for progressive boardgame loading (#180/#186)"
```

---

## Task 12: Rewire `BoardgameLookupPage`'s data fetching to fire six parallel requests

**Files:**
- Modify: `frontend/src/features/boardgames/BoardgameLookupPage.tsx:1-27` (imports), `:28-34` (`ViewState`), `:355-446` (`runSearch`/`runLookupById`/`applyResult`)

**Interfaces:**
- Consumes: `fetchBggById`, `fetchBggByQuery`, `fetchAmazon`, `fetchBoardGameQuest`, `fetchHall9000`, `fetchBrettspieleReport`, `fetchBrettspielpreise` (Task 10), `initialSources`, `mergeSources`, `Sources` (Task 11).
- Produces: `ViewState`'s `"result"` variant gains a `sources: Sources` field (replacing `enriching: boolean`); `state.game` is always the output of `mergeSources(local, sources, lang)`, recomputed on every source arrival.

- [ ] **Step 1: Update `ViewState`**

In `frontend/src/features/boardgames/BoardgameLookupPage.tsx`, change:
```typescript
  | { kind: "result"; game: Boardgame; enriching: boolean };
```
to:
```typescript
  | { kind: "result"; game: Boardgame; sources: Sources };
```

Add to the import block (after the existing `./api` import):
```typescript
import { initialSources, mergeSources, type Sources } from "./mergeSources";
```

- [ ] **Step 2: Replace the imports from `./api`**

Replace the `lookupBoardgame`, `lookupBoardgameById`, `lookupBoardgameLocal`, `lookupBoardgameLocalById` entries in the `./api` import list with:
```typescript
  fetchAmazon,
  fetchBggById,
  fetchBggByQuery,
  fetchBoardGameQuest,
  fetchBrettspieleReport,
  fetchBrettspielpreise,
  fetchHall9000,
  lookupBoardgameLocal,
  lookupBoardgameLocalById,
```
(`lookupBoardgameLocal`/`lookupBoardgameLocalById` are unchanged and still used for the instant answer - Task 9 left `local.php` untouched.) Also add `type BggResult` to the type-only imports.

- [ ] **Step 3: Rewrite `runSearch`/`runLookupById`/`applyResult`**

Replace the block from `function applyResult` through the end of `runLookupById` (originally lines 376-446) with:

```typescript
  function fireAllSources(bggId: number) {
    const patch = (patchFn: (s: Sources) => Sources) =>
      setState((current) => (current.kind === "result" ? { ...current, sources: patchFn(current.sources) } : current));

    fetchAmazon(bggId).then(
      (value) => patch((s) => ({ ...s, amazon: { status: "done", value } })),
      () => patch((s) => ({ ...s, amazon: { status: "done", value: { rating: null, price: null } } }))
    );
    fetchBoardGameQuest(bggId).then(
      (value) => patch((s) => ({ ...s, boardgamequest: { status: "done", value } })),
      () => patch((s) => ({ ...s, boardgamequest: { status: "done", value: { rating: null, review: null } } }))
    );
    fetchHall9000(bggId).then(
      (value) => patch((s) => ({ ...s, hall9000: { status: "done", value } })),
      () => patch((s) => ({ ...s, hall9000: { status: "done", value: { rating: null, players: null, duration: null, age: null } } }))
    );
    fetchBrettspieleReport(bggId).then(
      (value) => patch((s) => ({ ...s, brettspielereport: { status: "done", value } })),
      () => patch((s) => ({ ...s, brettspielereport: { status: "done", value: { rating: null, complexity: null } } }))
    );
    fetchBrettspielpreise(bggId).then(
      (value) => patch((s) => ({ ...s, brettspielpreise: { status: "done", value } })),
      () => patch((s) => ({ ...s, brettspielpreise: { status: "done", value: null } }))
    );
  }

  function applyBggResult(result: BggResult, local: Boardgame) {
    if (result.status === "ok") {
      const sources: Sources = { ...initialSources(), bgg: { status: "done", value: result.game } };
      setState({ kind: "result", game: mergeSources(local, sources, lang), sources });
      fireAllSources(result.game.bggId);
    } else if (result.status === "not_found") {
      setState({ kind: "not_found", query: result.query, suggestions: result.suggestions });
    } else {
      setState({ kind: "disambiguation", candidates: result.candidates });
    }
  }

  function errorState(err: unknown): ViewState {
    return { kind: "error", message: err instanceof ApiError ? err.message : "Something went wrong." };
  }

  async function runSearch(term: string) {
    setState({ kind: "loading" });

    let local: Boardgame | null = null;
    try {
      const localResult = await lookupBoardgameLocal(term, lang);
      if (localResult.status === "ok") {
        local = localResult.game;
        setState({ kind: "result", game: local, sources: initialSources() });
      } else if (localResult.status === "disambiguation") {
        setState({ kind: "disambiguation", candidates: localResult.candidates });
      }
    } catch {
      // Fall through to the full lookup.
    }

    try {
      applyBggResult(await fetchBggByQuery(term, lang), local ?? FALLBACK_PARTIAL);
    } catch (err) {
      setState((current) => (current.kind === "result" ? current : errorState(err)));
    }
  }

  async function runLookupById(bggId: number) {
    setState({ kind: "loading" });

    let local: Boardgame | null = null;
    try {
      const localResult = await lookupBoardgameLocalById(bggId, lang);
      if (localResult.status === "ok") {
        local = localResult.game;
        setState({ kind: "result", game: local, sources: initialSources() });
      }
    } catch {
      // Fall through to the full lookup.
    }

    try {
      applyBggResult(await fetchBggById(bggId, lang), local ?? FALLBACK_PARTIAL);
    } catch (err) {
      setState((current) => (current.kind === "result" ? current : errorState(err)));
    }
  }
```

Add this constant near the top of the file, alongside the other module-level constants (e.g. near `SUGGEST_MIN_LENGTH`):

```typescript
// #180/#186: when even the instant local answer fails (dump not
// imported, or a shared link to a game outside it), bgg.php's own
// response is still the base mergeSources() starts from - this stub
// exists only so there is always a Boardgame to spread over. Every
// field bgg.php actually answers with overwrites these placeholders
// immediately in the same merge pass.
const FALLBACK_PARTIAL: Boardgame = {
  bggId: 0,
  name: "",
  description: "",
  rating: null,
  numRatings: null,
  good: null,
  bad: null,
  partial: true,
  ratings: [],
  bgq: null,
  players: null,
  duration: null,
  age: null,
  complexity: null,
  prices: [],
  isExpansion: false,
  rank: null,
  source: { name: "BoardGameGeek", url: "https://boardgamegeek.com" },
};
```

- [ ] **Step 4: Fix the two other `enriching`/`applyResult` reads**

Grep the file for remaining uses:
```bash
cd frontend && grep -n "enriching\|applyResult\b" src/features/boardgames/BoardgameLookupPage.tsx
```
Every remaining `state.enriching` read (the "Loading the other sources…" indicator, `data-testid="enriching-indicator"`) is replaced in Task 13, which redesigns that indicator into per-section ones - leave those specific JSX lines for Task 13, but confirm no other `.tsx`/`.ts` file outside this one references `enriching` or `applyResult` (both are local to this component).

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```
Expected: errors only in `BoardgameLookupPage.tsx`'s JSX where `state.enriching` is still read (Task 13 fixes these) and possibly `BoardgameLookupPage.test.tsx` (Task 14 fixes these) - no errors anywhere else. If any other file errors, stop and investigate before continuing.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/boardgames/BoardgameLookupPage.tsx
git commit -m "Fire six parallel source fetches instead of one sequential lookup (#180/#186)"
```

(This task intentionally leaves the app non-compiling at the JSX/test level - Tasks 13 and 14 finish the migration. Committing mid-migration here is a deliberate exception to "always commit working code," scoped to this one multi-task feature branch, because splitting the JSX rewrite and the state rewrite into separately reviewable commits is more useful for review than one giant one. If executing via subagent-driven-development, tell the reviewing agent this task's build is expected to fail until Task 14 completes.)

---

## Task 13: Reorder the card, add per-section loading indicators

**Files:**
- Modify: `frontend/src/features/boardgames/BoardgameLookupPage.tsx` (the result card's JSX, roughly the region between the facts row and "Where to buy" - exact line numbers will have shifted after Task 12's edits, locate by the section headings: "How it plays", "Also rated by", "Where to buy", the good/bad `<div className="mt-6 grid gap-4 sm:grid-cols-2">` block, and the `GameDescription` render)

**Interfaces:**
- Consumes: `state.sources: Sources` (Task 12) instead of `state.enriching`.
- Produces: no new exports - this task is pure JSX restructuring.

- [ ] **Step 1: Add a small loading-dot component**

Add near the other small presentational components in this file (e.g. next to `Spinner`, if one already exists - grep for `function Spinner` first; if it doesn't exist, add this one near `ReviewSnippet`):

```typescript
// #180/#186: replaces the single global "Loading the other sources…"
// message - each external section gets its own, so a fast source's
// content appears immediately instead of waiting for the slowest one.
function SectionLoading({ label }: { label: string }) {
  return (
    <p aria-live="polite" className="mt-3 flex items-center gap-2 text-xs text-slate-400">
      <Spinner />
      <span>Loading {label}…</span>
    </p>
  );
}
```

(If no `Spinner` component exists yet in this file, check `data-testid="enriching-indicator"`'s current JSX for whatever spinner markup it already uses, and reuse that exact markup as `Spinner` rather than inventing new CSS.)

- [ ] **Step 2: Remove the old global enriching indicator**

Delete the block that reads `state.enriching` and renders `data-testid="enriching-indicator"` / "Loading the other sources…" text - it's replaced by the per-section ones below.

- [ ] **Step 3: Move the "How it plays" block, gate it on `boardgamequest`**

Move the `state.game.bgq && (<section>...How it plays...</section>)` block from its current position (between the category tags and the description) to immediately before the `"Also rated by"` section. Wrap it with a loading state:

```tsx
{state.sources.boardgamequest.status === "pending" ? (
  <SectionLoading label="how it plays" />
) : (
  state.game.bgq && (
    <section className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">How it plays</h3>
      <p className="mt-1 text-sm text-slate-300">{state.game.bgq.rules}</p>
      <a
        href={state.game.bgq.url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-xs text-slate-400 underline hover:text-slate-300"
      >
        Read the full review at Board Game Quest
      </a>
    </section>
  )
)}
```

- [ ] **Step 4: Gate "Also rated by" on the four rating sources**

Wrap the existing `(state.game.ratings?.length ?? 0) > 0 && (...)` block: show `<SectionLoading label="ratings" />` while ANY of `amazon`/`boardgamequest`/`hall9000`/`brettspielereport` is still `"pending"` AND `state.game.ratings.length === 0` (so a section that already has at least one rating shown doesn't flicker back to a spinner while a slower sibling source is still out):

```tsx
{(() => {
  const ratingsPending =
    state.sources.amazon.status === "pending" ||
    state.sources.boardgamequest.status === "pending" ||
    state.sources.hall9000.status === "pending" ||
    state.sources.brettspielereport.status === "pending";
  if (ratingsPending && state.game.ratings.length === 0) {
    return <SectionLoading label="other ratings" />;
  }
  return (
    (state.game.ratings?.length ?? 0) > 0 && (
      /* unchanged existing "Also rated by" JSX */
    )
  );
})()}
```

- [ ] **Step 5: Gate "Where to buy" on the two price sources**

Same pattern for the existing `<div className="mt-6 border-t border-slate-800 pt-4">...Where to buy...</div>` block: `state.sources.amazon.status === "pending" || state.sources.brettspielpreise.status === "pending"`, shown only while `state.game.prices.length === 0`.

- [ ] **Step 6: Gate the facts row on `bgg`/`hall9000`**

The facts row (`{(state.game.players || state.game.duration || ...) && (...)}`) already renders nothing until `state.game.players`/etc. are non-null - no change needed there structurally, but add a brief loading state before `bgg` resolves at all (otherwise the row is silently absent with no explanation during the ~20ms-1.3s `bgg.php` wait):

```tsx
{state.sources.bgg.status === "pending" ? (
  <SectionLoading label="details" />
) : (
  /* unchanged existing facts-row JSX */
)}
```

- [ ] **Step 7: Manually verify against the running dev stack**

```bash
docker compose restart frontend
```
Navigate to `http://localhost:5173/boardgames?bgg_id=13&lang=de`, confirm: the card renders almost immediately with BGG's own content, each of Facts/Also-rated-by/How-it-plays/Where-to-buy independently shows a small spinner then fills in, and How-it-plays now sits directly above Also-rated-by rather than above the description.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/boardgames/BoardgameLookupPage.tsx
git commit -m "Reorder the card and add per-section loading indicators (#180/#186)"
```

---

## Task 14: Update the existing frontend test suite

**Files:**
- Modify: `frontend/src/features/boardgames/BoardgameLookupPage.test.tsx`

This is the largest mechanical task in the plan. The `Boardgame` fixture shape (`CATAN` and every inline game literal) is unchanged - only the *mocking* changes, from one `vi.spyOn(api, "lookupBoardgame"/"lookupBoardgameById")` per test to mocking the six new fetch functions.

- [ ] **Step 1: Add a shared test helper**

Near the top of the file, after the `CATAN` fixture, add a helper that mocks all five external endpoints as immediately-resolving-empty (the common case for tests that don't care about ratings/prices/how-it-plays):

```typescript
function mockEmptyExternalSources() {
  vi.spyOn(api, "fetchAmazon").mockResolvedValue({ rating: null, price: null });
  vi.spyOn(api, "fetchBoardGameQuest").mockResolvedValue({ rating: null, review: null });
  vi.spyOn(api, "fetchHall9000").mockResolvedValue({ rating: null, players: null, duration: null, age: null });
  vi.spyOn(api, "fetchBrettspieleReport").mockResolvedValue({ rating: null, complexity: null });
  vi.spyOn(api, "fetchBrettspielpreise").mockResolvedValue(null);
}
```

- [ ] **Step 2: Rewrite every `vi.spyOn(api, "lookupBoardgame", ...)` / `"lookupBoardgameById"` call**

Grep for every occurrence:
```bash
cd frontend && grep -n '"lookupBoardgame"\|"lookupBoardgameById"' src/features/boardgames/BoardgameLookupPage.test.tsx
```

For each one, the mechanical transformation is: the mock currently resolves `{ status: "ok", game: CATAN }` (or a variant). Replace `vi.spyOn(api, "lookupBoardgame")`/`"lookupBoardgameById"` with `vi.spyOn(api, "fetchBggByQuery")`/`"fetchBggById"` respectively, and change the resolved value's `game: CATAN` (a full `Boardgame`) to `game: bggCoreFrom(CATAN)` using this new helper (add it next to `mockEmptyExternalSources`):

```typescript
// The BggCoreResult shape bgg.php now returns - every Boardgame field
// except ratings/bgq/prices (those come from the other five endpoints).
function bggCoreFrom(game: Boardgame): api.BggCoreResult {
  const { ratings: _ratings, bgq: _bgq, prices: _prices, ...core } = game;
  return core;
}
```

Then add `mockEmptyExternalSources();` as the first line of the test body (before `renderPage(...)`) for every test that was relying on `lookupBoardgame`/`lookupBoardgameById` alone, UNLESS that specific test already separately mocks one of the five external fetches for its own purpose (e.g. the price tests added in #176/#177/#179 - those replace the relevant single mock from `mockEmptyExternalSources`'s list with their own, keeping the other four).

Example - the existing test at (pre-Task-12) line ~1169:
```typescript
  it("shows the amazon.de retail price and links to used-market searches", async () => {
    vi.spyOn(api, "lookupBoardgame").mockResolvedValue({
      status: "ok",
      game: { ...CATAN, prices: [{ value: 22.9, currency: "EUR", source: "Amazon.de", url: "https://www.amazon.de/dp/B0DSWFN2XZ" }] },
    });

    renderPage("/boardgames?q=catan");
    ...
```
becomes:
```typescript
  it("shows the amazon.de retail price and links to used-market searches", async () => {
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });
    vi.spyOn(api, "fetchAmazon").mockResolvedValue({
      rating: null,
      price: { value: 22.9, currency: "EUR", source: "Amazon.de", url: "https://www.amazon.de/dp/B0DSWFN2XZ" },
    });
    vi.spyOn(api, "fetchBoardGameQuest").mockResolvedValue({ rating: null, review: null });
    vi.spyOn(api, "fetchHall9000").mockResolvedValue({ rating: null, players: null, duration: null, age: null });
    vi.spyOn(api, "fetchBrettspieleReport").mockResolvedValue({ rating: null, complexity: null });
    vi.spyOn(api, "fetchBrettspielpreise").mockResolvedValue(null);

    renderPage("/boardgames?q=catan");
    ...
```

Apply this same substitution pattern to every remaining `lookupBoardgame`/`lookupBoardgameById` occurrence in the file - each one follows the identical shape (a `vi.spyOn` returning `{status:"ok", game: <some Boardgame-shaped object>}` or `{status:"not_found",...}`/`{status:"disambiguation",...}`, which pass through to `fetchBggByQuery`/`fetchBggById` unchanged since those statuses are shared between `BggResult` and the old `BoardgameLookupResult`).

- [ ] **Step 3: Update the enriching-indicator test**

The test `"shows an enriching indicator on the card while the slow sources load (#128)"` currently checks `data-testid="enriching-indicator"`. Replace it with a check against one of the new per-section indicators (e.g. assert the ratings section's loading text is present while `fetchAmazon` etc. haven't resolved yet, then absent once they do) - use a manually-controlled promise the same way the original test does:

```typescript
  it("shows a per-section loading indicator while the slow sources load (#128/#186)", async () => {
    vi.spyOn(api, "fetchBggByQuery").mockResolvedValue({ status: "ok", game: bggCoreFrom(CATAN) });
    let resolveAmazon!: (r: api.AmazonResult) => void;
    vi.spyOn(api, "fetchAmazon").mockReturnValue(new Promise((resolve) => { resolveAmazon = resolve; }));
    vi.spyOn(api, "fetchBoardGameQuest").mockResolvedValue({ rating: null, review: null });
    vi.spyOn(api, "fetchHall9000").mockResolvedValue({ rating: null, players: null, duration: null, age: null });
    vi.spyOn(api, "fetchBrettspieleReport").mockResolvedValue({ rating: null, complexity: null });
    vi.spyOn(api, "fetchBrettspielpreise").mockResolvedValue(null);

    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "catan" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(screen.getByText(/Loading other ratings/)).toBeInTheDocument());

    resolveAmazon({ rating: null, price: null });

    await waitFor(() => expect(screen.queryByText(/Loading other ratings/)).not.toBeInTheDocument());
  });
```

- [ ] **Step 4: Run the full frontend suite, fix remaining failures one at a time**

```bash
cd frontend && npx vitest run src/features/boardgames/BoardgameLookupPage.test.tsx
```
Work through failures top to bottom - at this point every failure should be either (a) a test still using the old mock names (apply Step 2's pattern) or (b) a test asserting DOM order that changed because How-it-plays moved (Task 13) - update the order assertion, not the component.

- [ ] **Step 5: Run the full frontend suite, `tsc`, `eslint`**

```bash
npx vitest run
npx tsc --noEmit
npx eslint src/features/boardgames
```
Expected: all green, no errors, no warnings.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/boardgames/BoardgameLookupPage.test.tsx
git commit -m "Update BoardgameLookupPage tests for the six-endpoint progressive-loading model (#180/#186)"
```

---

## Task 15: Full-stack manual verification and timing comparison

**Files:** none - verification only.

- [ ] **Step 1: Full backend and frontend suites green**

```bash
docker compose up -d --build php
docker compose exec -T -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test php sh -c 'cd api && ./vendor/bin/phpunit'
cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src/features/boardgames
```

- [ ] **Step 2: Browser verification against the dev stack**

`docker compose restart frontend`, then in the browser (Claude-in-Chrome or manually): navigate to a board game never looked up in this dev DB before, confirm the card renders progressively (facts/description appear almost immediately, each of How-it-plays/Also-rated-by/Where-to-buy fills in independently with its own brief spinner, no single 24s blank wait).

- [ ] **Step 3: Timing comparison against production, after deploy**

Once merged and deployed, repeat the same cold-request timing measurement from the spec (a bgg_id never looked up on production before):
```bash
curl -s -m 30 -o /dev/null -w "total time: %{time_total}s\n" "https://sheoforge.de/api/boardgames/bgg.php?bgg_id=<fresh id>&lang=de"
```
Expected: a few hundred ms to ~1.5s (matching the per-source cold numbers in the spec for `bgg.php` alone), not 24s - the 24s was the sum of six sequential calls, and `bgg.php` is now only one of six parallel ones. Report the actual number back rather than assuming.
