<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/EdhrecComboClient.php';

final class EdhrecComboClientTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM commander_spellbook_cache');
    }

    public function testMapsCardlistToCombo(): void
    {
        $requested = null;
        $client = new EdhrecComboClient(function (string $url) use (&$requested) {
            $requested = $url;
            return $this->response(200, ['container' => ['json_dict' => ['cardlists' => [[
                'header' => "Ashnod's Altar + Pitiless Plunderer",
                'href' => '/combos/colorless/1580-2034',
                'cardviews' => [[
                    'name' => 'Pitiless Plunderer',
                    'id' => '8d727b9b-6114-414d-9172-16b6e1db41cc',
                ]],
                'combo' => [
                    'cardIds' => [1580, 2034],
                    'count' => 60566,
                    'results' => ['Infinite colorless mana'],
                ],
            ]]]]]);
        });

        $combos = $client->findCombos("Ashnod's Altar");

        // The apostrophe is dropped, not hyphenated - EDHREC 403s otherwise.
        $this->assertSame(EDHREC_JSON_BASE_URL . '/pages/combos/ashnods-altar.json', $requested);
        $this->assertSame([[
            // The card id doubles as the Scryfall image path - no second call.
            'otherCards' => [[
                'name' => 'Pitiless Plunderer',
                'imageUrl' => 'https://cards.scryfall.io/small/front/8/d/8d727b9b-6114-414d-9172-16b6e1db41cc.jpg',
            ]],
            'cardCount' => 2,
            'numDecks' => 60566,
            'produces' => ['Infinite colorless mana'],
            'url' => 'https://edhrec.com/combos/colorless/1580-2034',
        ]], $combos);
    }

    public function testFailedLookupReturnsNullAndIsNotCached(): void
    {
        $calls = 0;
        $failing = function () use (&$calls) {
            $calls++;
            return ['body' => null, 'status' => 0, 'error' => 'timeout'];
        };

        $this->assertNull((new EdhrecComboClient($failing))->findCombos('Sol Ring'));
        $this->assertNull((new EdhrecComboClient($failing))->findCombos('Sol Ring'));

        $this->assertSame(2, $calls, 'a failed lookup must not be cached as "no combos"');
        $this->assertSame(
            0,
            (int) db()->query("SELECT COUNT(*) FROM commander_spellbook_cache WHERE card_name = 'Sol Ring'")->fetchColumn()
        );
    }

    public function testCardWithNoComboPageIsCachedAsARealAnswer(): void
    {
        $calls = 0;
        // EDHREC has no file for a card in no combos, and its host answers
        // 403 rather than 404 for that.
        $missing = function () use (&$calls) {
            $calls++;
            return ['body' => 'Forbidden', 'status' => 403, 'error' => null];
        };

        $this->assertSame([], (new EdhrecComboClient($missing))->findCombos('Grizzly Bears'));
        $this->assertSame([], (new EdhrecComboClient($missing))->findCombos('Grizzly Bears'));

        $this->assertSame(1, $calls, '"no combos" is data - the second call should hit the cache');
    }

    public function testServerErrorIsAFailureNotAnEmptyAnswer(): void
    {
        $client = new EdhrecComboClient(fn() => ['body' => 'nope', 'status' => 502, 'error' => null]);

        $this->assertNull($client->findCombos('Lightning Bolt'));
    }

    private function response(int $status, array $json): array
    {
        return ['body' => json_encode($json), 'status' => $status, 'error' => null];
    }
}
