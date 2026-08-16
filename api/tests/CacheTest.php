<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/Cache.php';

final class CacheTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM scryfall_cache');
    }

    public function testCacheMissCallsFetcherAndStoresResult(): void
    {
        $calls = 0;
        $fetch = function () use (&$calls) {
            $calls++;
            return ['value' => 'fresh'];
        };

        $result = cache_aside('scryfall_cache', 'cache_key', 'some-key', 300, $fetch);

        $this->assertSame(1, $calls);
        $this->assertSame(['value' => 'fresh'], $result);
    }

    public function testCacheHitDoesNotCallFetcherAgain(): void
    {
        $calls = 0;
        $fetch = function () use (&$calls) {
            $calls++;
            return ['value' => 'fresh'];
        };

        cache_aside('scryfall_cache', 'cache_key', 'some-key', 300, $fetch);
        cache_aside('scryfall_cache', 'cache_key', 'some-key', 300, $fetch);

        $this->assertSame(1, $calls, 'second call within the TTL should be served from cache, not refetched');
    }

    // "The source answered, and has nothing for this game" is an answer, and
    // re-asking it on every request is what made a repeat boardgame lookup as
    // slow as the first one (#72). Failures are the ones that must not stick,
    // and those throw.
    public function testAnAnswerOfNothingIsCachedLikeAnyOtherAnswer(): void
    {
        $calls = 0;
        $fetch = function () use (&$calls) {
            $calls++;
            return null;
        };

        $result = cache_aside('scryfall_cache', 'cache_key', 'some-key', 300, $fetch, 300);
        $second = cache_aside('scryfall_cache', 'cache_key', 'some-key', 300, $fetch, 300);

        $this->assertNull($result);
        $this->assertNull($second);
        $this->assertSame(1, $calls, 'a source that answered "nothing" should not be asked again within the TTL');
    }

    // Callers that have not opted into negative caching keep the old contract:
    // their null still means "the call failed", and still isn't stored.
    public function testWithoutAMissTtlANullIsStillNotCached(): void
    {
        $calls = 0;
        $fetch = function () use (&$calls) {
            $calls++;
            return null;
        };

        cache_aside('scryfall_cache', 'cache_key', 'some-key', 300, $fetch);
        cache_aside('scryfall_cache', 'cache_key', 'some-key', 300, $fetch);

        $this->assertSame(2, $calls);
        $this->assertSame(0, (int) db()->query("SELECT COUNT(*) FROM scryfall_cache WHERE cache_key = 'some-key'")->fetchColumn());
    }

    public function testAFailedFetchThrowsAndIsNotCached(): void
    {
        $calls = 0;
        $fetch = function () use (&$calls) {
            $calls++;
            throw new RuntimeException('upstream is down');
        };

        try {
            cache_aside('scryfall_cache', 'cache_key', 'some-key', 300, $fetch, 300);
            $this->fail('the failure should reach the caller, not be swallowed');
        } catch (RuntimeException $e) {
            $this->assertSame('upstream is down', $e->getMessage());
        }

        $this->assertSame(
            0,
            (int) db()->query("SELECT COUNT(*) FROM scryfall_cache WHERE cache_key = 'some-key'")->fetchColumn(),
            'a transient outage must not pin a wrong answer for the full TTL'
        );
    }

    // A game nobody has reviewed yet may be reviewed next month, so an empty
    // answer is held for less time than a real one.
    public function testAnEmptyAnswerExpiresSoonerWhenGivenItsOwnTtl(): void
    {
        cache_aside('scryfall_cache', 'cache_key', 'empty-key', 3000, fn() => null, 300);
        cache_aside('scryfall_cache', 'cache_key', 'full-key', 3000, fn() => ['value' => 'fresh'], 300);

        $ttl = fn(string $key) => (int) db()
            ->query("SELECT TIMESTAMPDIFF(SECOND, NOW(), expires_at) FROM scryfall_cache WHERE cache_key = '$key'")
            ->fetchColumn();

        $this->assertSame(
            1,
            (int) db()->query("SELECT COUNT(*) FROM scryfall_cache WHERE cache_key = 'empty-key'")->fetchColumn(),
            'the empty answer has to actually be stored, or this asserts nothing'
        );
        $this->assertGreaterThan(0, $ttl('empty-key'));
        $this->assertLessThanOrEqual(300, $ttl('empty-key'));
        $this->assertGreaterThan(300, $ttl('full-key'));
    }

    public function testExpiredCacheEntryTriggersRefetch(): void
    {
        $calls = 0;
        $fetch = function () use (&$calls) {
            $calls++;
            return ['value' => 'fresh'];
        };

        cache_aside('scryfall_cache', 'cache_key', 'some-key', 300, $fetch);
        db()->exec("UPDATE scryfall_cache SET expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE cache_key = 'some-key'");
        cache_aside('scryfall_cache', 'cache_key', 'some-key', 300, $fetch);

        $this->assertSame(2, $calls, 'an expired cache row must not be served - it should trigger a real refetch');
    }
}
