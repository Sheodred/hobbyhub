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
            'layout' => null,
            'faces' => null,
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

    // Scryfall puts "" - not null - at the top level of a double-faced card
    // and the real values on the faces, which is why mana cost needs an
    // emptiness check rather than the ?? the other fields use (#34).
    public function testDoubleFacedCardTakesCostAndTextFromItsFrontFace(): void
    {
        $client = new ScryfallClient(fn() => ['data' => [[
            'id' => 'dfc-1',
            'name' => 'Delver of Secrets // Insectile Aberration',
            'mana_cost' => '',
            'type_line' => 'Creature — Human Wizard // Creature — Human Insect',
            'card_faces' => [
                [
                    'mana_cost' => '{U}',
                    'oracle_text' => 'At the beginning of your upkeep, look at the top card of your library.',
                    'image_uris' => ['normal' => 'https://example.com/front.jpg', 'art_crop' => 'https://example.com/art.jpg'],
                ],
                ['mana_cost' => '', 'oracle_text' => 'Flying'],
            ],
        ]], 'has_more' => false, 'total_cards' => 1]);

        $card = $client->search('delver of secrets', 1)['cards'][0];

        $this->assertSame('{U}', $card['manaCost']);
        $this->assertStringStartsWith('At the beginning', $card['oracleText']);
        $this->assertSame('https://example.com/front.jpg', $card['imageUrl']);
    }

    public function testTransformCardExposesBothFacesWithTheirOwnImages(): void
    {
        $client = new ScryfallClient(fn() => ['data' => [[
            'id' => 'dfc-1',
            'name' => 'Delver of Secrets // Insectile Aberration',
            'layout' => 'transform',
            'card_faces' => [
                [
                    'name' => 'Delver of Secrets',
                    'mana_cost' => '{U}',
                    'type_line' => 'Creature — Human Wizard',
                    'oracle_text' => 'At the beginning of your upkeep, look at the top card of your library.',
                    'image_uris' => ['normal' => 'https://example.com/front.jpg'],
                ],
                [
                    'name' => 'Insectile Aberration',
                    'mana_cost' => '',
                    'type_line' => 'Creature — Human Insect',
                    'oracle_text' => 'Flying',
                    'image_uris' => ['normal' => 'https://example.com/back.jpg'],
                ],
            ],
        ]], 'has_more' => false, 'total_cards' => 1]);

        $card = $client->search('delver of secrets', 1)['cards'][0];

        $this->assertSame('transform', $card['layout']);
        $this->assertSame([
            [
                'name' => 'Delver of Secrets',
                'manaCost' => '{U}',
                'typeLine' => 'Creature — Human Wizard',
                'oracleText' => 'At the beginning of your upkeep, look at the top card of your library.',
                'imageUrl' => 'https://example.com/front.jpg',
            ],
            [
                'name' => 'Insectile Aberration',
                'manaCost' => '',
                'typeLine' => 'Creature — Human Insect',
                'oracleText' => 'Flying',
                'imageUrl' => 'https://example.com/back.jpg',
            ],
        ], $card['faces']);
    }

    // A split card is one physical card: its image lives at the top level and
    // neither face has image_uris of its own, so both faces' imageUrl is null.
    public function testSplitCardFacesHaveNoOwnImage(): void
    {
        $client = new ScryfallClient(fn() => ['data' => [[
            'id' => 'split-1',
            'name' => 'Fire // Ice',
            'layout' => 'split',
            'mana_cost' => '{1}{R} // {1}{U}',
            'type_line' => 'Instant // Instant',
            'image_uris' => ['normal' => 'https://example.com/fireice.jpg'],
            'card_faces' => [
                ['name' => 'Fire', 'mana_cost' => '{1}{R}', 'type_line' => 'Instant', 'oracle_text' => 'Fire deals 2 damage divided as you choose.'],
                ['name' => 'Ice', 'mana_cost' => '{1}{U}', 'type_line' => 'Instant', 'oracle_text' => 'Tap target permanent. Draw a card.'],
            ],
        ]], 'has_more' => false, 'total_cards' => 1]);

        $card = $client->search('fire // ice', 1)['cards'][0];

        $this->assertSame('split', $card['layout']);
        $this->assertSame('https://example.com/fireice.jpg', $card['imageUrl']);
        $this->assertSame(['Fire', 'Ice'], array_column($card['faces'], 'name'));
        $this->assertSame('Tap target permanent. Draw a card.', $card['faces'][1]['oracleText']);
        $this->assertNull($card['faces'][0]['imageUrl']);
        $this->assertNull($card['faces'][1]['imageUrl']);
    }
}
