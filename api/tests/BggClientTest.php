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

    public function testLookupReturnsNullWhenBggHasNoSuchGame(): void
    {
        // BGG answers a real "no such id" with a 200 and an empty <items/>,
        // which is data, not a failure - a genuine 404 for the caller.
        $client = new BggClient(fn() => $this->thingXml(''));

        $this->assertNull($client->lookup(999999));
    }

    public function testLookupThrowsWhenTheBggCallFails(): void
    {
        // A null fetch means the HTTP call itself failed (timeout, 401, 5xx).
        // That must not be reported as "game not found" - the endpoint turns
        // a throw into a 502, which is the honest answer.
        $client = new BggClient(fn() => null);

        $this->expectException(RuntimeException::class);
        $client->lookup(999999);
    }

    public function testResolveSearchThrowsWhenTheBggCallFails(): void
    {
        $client = new BggClient(fn() => null);

        $this->expectException(RuntimeException::class);
        $client->resolveSearch('catan');
    }

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
}
