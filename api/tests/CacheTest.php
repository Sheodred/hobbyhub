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

    public function testNullFetchResultIsNotCached(): void
    {
        $calls = 0;
        $fetch = function () use (&$calls) {
            $calls++;
            return null;
        };

        $result = cache_aside('scryfall_cache', 'cache_key', 'some-key', 300, $fetch);

        $this->assertNull($result);
        $this->assertSame(0, (int) db()->query("SELECT COUNT(*) FROM scryfall_cache WHERE cache_key = 'some-key'")->fetchColumn());

        cache_aside('scryfall_cache', 'cache_key', 'some-key', 300, $fetch);
        $this->assertSame(2, $calls, 'a failed fetch must not be cached as if it were data - the next request retries');
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
