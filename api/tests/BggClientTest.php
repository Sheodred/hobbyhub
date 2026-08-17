<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/BggClient.php';

final class BggClientTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgg_lookup_cache');
        db()->exec('DELETE FROM bgg_search_cache');
        db()->exec('DELETE FROM bgg_ranks');
    }

    private function seedRanks(): void
    {
        // Wingspan is deliberately left unranked - BGG ranks only games past
        // a ratings threshold, and most of the 180k dump has no rank at all.
        db()->exec(
            "INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES
             (13, 'Catan', 1995, 7.09029, 143738, 0, 566),
             (926, 'Catan: Cities & Knights', 1998, 7.4, 40000, 1, 401),
             (266192, 'Wingspan', 2019, 8.1, 120000, 0, NULL)"
        );
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

    public function testLookupThrowsWhenTheBggCallFailsAndNoLocalDataExists(): void
    {
        // A null fetch means the HTTP call itself failed (timeout, 401, 5xx).
        // That must not be reported as "game not found" - the endpoint turns
        // a throw into a 502, which is the honest answer.
        $client = new BggClient(fn() => null);

        $this->expectException(RuntimeException::class);
        $client->lookup(999999);
    }

    public function testResolveSearchThrowsWhenTheBggCallFailsAndNoLocalDataExists(): void
    {
        $client = new BggClient(fn() => null);

        $this->expectException(RuntimeException::class);
        $client->resolveSearch('catan');
    }

    public function testLookupFallsBackToTheLocalRanksTableWhenBggIsUnreachable(): void
    {
        $this->seedRanks();
        $client = new BggClient(fn() => null);

        $result = $client->lookup(13);

        $this->assertSame('Catan', $result['name']);
        $this->assertSame(7.1, $result['rating']);
        $this->assertSame(143738, $result['numRatings']);
        $this->assertTrue($result['partial'], 'a ranks-backed answer carries no description or comments');
        $this->assertSame('', $result['description']);
        $this->assertNull($result['good']);
        $this->assertNull($result['bad']);
        $this->assertSame('https://boardgamegeek.com/boardgame/13', $result['source']['url']);
    }

    public function testFallbackLookupReportsWhetherTheGameIsAnExpansion(): void
    {
        $this->seedRanks();
        $client = new BggClient(fn() => null);

        $this->assertTrue($client->lookup(926)['isExpansion'], 'Cities & Knights needs a base game');
        $this->assertFalse($client->lookup(13)['isExpansion']);
    }

    public function testLookupReadsTheExpansionFlagFromTheThingType(): void
    {
        // The live answer carries it on the item itself, so the flag survives
        // BGG coming back - it is not a fallback-only field.
        $expansion = new BggClient(fn() => $this->thingXml(
            '<item type="boardgameexpansion" id="926"><name type="primary" value="Catan: Cities &amp; Knights"/></item>'
        ));
        $this->assertTrue($expansion->lookup(926)['isExpansion']);

        $base = new BggClient(fn() => $this->thingXml(
            '<item type="boardgame" id="13"><name type="primary" value="Catan"/></item>'
        ));
        $this->assertFalse($base->lookup(13)['isExpansion']);
    }

    public function testLookupCarriesTheDumpsRankOnBothPaths(): void
    {
        $this->seedRanks();

        // Served from the dump…
        $this->assertSame(566, (new BggClient(fn() => null))->lookup(13)['rank']);

        // …and from the live API, which does not carry the dump's rank
        // itself. Without this the field would vanish the moment #40 clears.
        $live = new BggClient(fn() => $this->thingXml(
            '<item type="boardgame" id="13"><name type="primary" value="Catan"/></item>'
        ));
        $this->assertSame(566, $live->lookup(13)['rank']);
    }

    public function testAnUnrankedGameReportsNoRankRatherThanZero(): void
    {
        $this->seedRanks();

        // BGG ranks only games past a ratings threshold; 0 in the dump means
        // "unranked", and rendering it as rank 0 would be a wrong answer.
        $this->assertNull((new BggClient(fn() => null))->lookup(266192)['rank']);
    }

    public function testLookupReportsNoRankWhenTheDumpHasNotBeenImported(): void
    {
        $client = new BggClient(fn() => $this->thingXml(
            '<item type="boardgame" id="13"><name type="primary" value="Catan"/></item>'
        ));

        $this->assertNull($client->lookup(13)['rank'], 'an empty bgg_ranks must not break a live answer');
    }

    public function testFallbackLookupIsNotCached(): void
    {
        $this->seedRanks();
        (new BggClient(fn() => null))->lookup(13);

        $this->assertSame(
            0,
            (int) db()->query('SELECT COUNT(*) FROM bgg_lookup_cache WHERE bgg_id = 13')->fetchColumn(),
            'dump-derived data must not occupy the 14-day cache - it would outlive the outage that caused it'
        );
    }

    public function testResolveSearchFallsBackToAnExactLocalNameMatch(): void
    {
        $this->seedRanks();

        $this->assertSame(
            ['status' => 'ok', 'bggId' => 13],
            (new BggClient(fn() => null))->resolveSearch('  CATAN ')
        );
    }

    public function testResolveSearchFallbackOffersLocalPrefixMatchesForDisambiguation(): void
    {
        $this->seedRanks();

        $result = (new BggClient(fn() => null))->resolveSearch('cat');

        $this->assertSame('disambiguation', $result['status']);
        $this->assertCount(2, $result['candidates']);
        // Most-rated first, so the game people actually meant leads.
        $this->assertSame(13, $result['candidates'][0]['bggId']);
        $this->assertSame(1995, $result['candidates'][0]['yearPublished']);
    }

    public function testResolveSearchFallbackMatchesLocalNameWithPunctuationStripped(): void
    {
        // #73: the dump stores "Brass: Birmingham" but a user has no reason
        // to type the colon. Exact and prefix passes both miss it verbatim,
        // so a third, punctuation-insensitive pass must catch it instead of
        // falling through to the "can't confirm" error.
        db()->exec(
            "INSERT INTO bgg_ranks (bgg_id, name, year_published, average, users_rated, is_expansion, bgg_rank) VALUES
             (224517, 'Brass: Birmingham', 2018, 8.6, 50000, 0, 5)"
        );

        $this->assertSame(
            ['status' => 'ok', 'bggId' => 224517],
            (new BggClient(fn() => null))->resolveSearch('Brass Birmingham')
        );
    }

    public function testResolveSearchFallbackStillThrowsWhenNothingMatchesLocally(): void
    {
        $this->seedRanks();

        $this->expectException(RuntimeException::class);
        (new BggClient(fn() => null))->resolveSearch('zzzznonexistentgamezzzz');
    }

    public function testConfiguredTokenIsSentAsAnAuthorizationHeader(): void
    {
        $seen = null;
        $client = new BggClient(function ($url, $timeout = 10, array $headers = []) use (&$seen) {
            $seen = $headers;
            return $this->thingXml('<item id="7"><name type="primary" value="Azul"/></item>');
        }, 'test-token-123');

        $client->lookup(7);

        $this->assertContains('Authorization: Bearer test-token-123', $seen);
    }

    public function testNoAuthorizationHeaderIsSentWhenNoTokenIsConfigured(): void
    {
        $seen = null;
        $client = new BggClient(function ($url, $timeout = 10, array $headers = []) use (&$seen) {
            $seen = $headers;
            return $this->thingXml('<item id="7"><name type="primary" value="Azul"/></item>');
        }, '');

        $client->lookup(7);

        $this->assertSame([], $seen, 'an empty token must not produce a header at all');
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
