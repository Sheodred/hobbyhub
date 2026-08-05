<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/ScryfallClient.php';

final class ScryfallClientTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM scryfall_cache');
    }

    public function testCacheMissCallsFetcherAndStoresMappedResult(): void
    {
        $calls = 0;
        $client = new ScryfallClient(function () use (&$calls) {
            $calls++;
            return [
                'data' => [[
                    'id' => 'abc-123',
                    'name' => 'Lightning Bolt',
                    'mana_cost' => '{R}',
                    'type_line' => 'Instant',
                    'oracle_text' => 'Lightning Bolt deals 3 damage to any target.',
                    'colors' => ['R'],
                    'set_name' => 'Limited Edition Alpha',
                    'rarity' => 'common',
                    'image_uris' => ['normal' => 'https://example.com/normal.jpg', 'art_crop' => 'https://example.com/art.jpg'],
                ]],
                'has_more' => false,
                'total_cards' => 1,
            ];
        });

        $result = $client->search('lightning bolt', 1);

        $this->assertSame(1, $calls);
        $this->assertSame(1, $result['totalCards']);
        $this->assertFalse($result['hasMore']);
        $this->assertSame([
            'id' => 'abc-123',
            'name' => 'Lightning Bolt',
            'manaCost' => '{R}',
            'typeLine' => 'Instant',
            'oracleText' => 'Lightning Bolt deals 3 damage to any target.',
            'colors' => ['R'],
            'setName' => 'Limited Edition Alpha',
            'rarity' => 'common',
            'imageUrl' => 'https://example.com/normal.jpg',
            'artCropUrl' => 'https://example.com/art.jpg',
        ], $result['cards'][0]);
    }

    public function testCacheHitDoesNotCallFetcherAgain(): void
    {
        $calls = 0;
        $fetcher = function () use (&$calls) {
            $calls++;
            return ['data' => [], 'has_more' => false, 'total_cards' => 0];
        };

        (new ScryfallClient($fetcher))->search('sol ring', 1);
        (new ScryfallClient($fetcher))->search('sol ring', 1);

        $this->assertSame(1, $calls, 'second call within the TTL should be served from scryfall_cache, not refetched');
    }

    public function testExpiredCacheEntryTriggersRefetch(): void
    {
        $calls = 0;
        $fetcher = function () use (&$calls) {
            $calls++;
            return ['data' => [], 'has_more' => false, 'total_cards' => 0];
        };

        (new ScryfallClient($fetcher))->search('expired query', 1);
        db()->exec("UPDATE scryfall_cache SET expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE cache_key = 'search:expired query:1'");
        (new ScryfallClient($fetcher))->search('expired query', 1);

        $this->assertSame(2, $calls, 'an expired cache row must not be served - it should trigger a real refetch');
    }

    public function testNoCardsMatchIsAnEmptyResultNotAnException(): void
    {
        // Scryfall's real behavior for "no cards match this query" is a 404,
        // which http_get_json() (via http_get_raw()) turns into a null
        // return - the fetcher below reproduces that null, not a thrown error.
        $client = new ScryfallClient(fn() => null);

        $result = $client->search('zzzzznonexistentcardzzzz', 1);

        $this->assertSame(['cards' => [], 'hasMore' => false, 'totalCards' => 0], $result);
    }

    public function testGetCardByNameReturnsNullWhenNotFound(): void
    {
        $client = new ScryfallClient(fn() => null);

        $this->assertNull($client->getCardByName('Not A Real Card'));
    }
}
