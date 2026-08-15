<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/CommanderSpellbookClient.php';

final class CommanderSpellbookClientTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM commander_spellbook_cache');
    }

    public function testMapsVariantToCombo(): void
    {
        $client = new CommanderSpellbookClient(fn() => ['results' => [[
            'id' => '1580-2034-4871',
            'uses' => [
                ['card' => ['name' => 'Pitiless Plunderer']],
                ['card' => ["name" => "Ashnod's Altar"]],
            ],
            'produces' => [['feature' => ['name' => 'Infinite colorless mana']]],
            'popularity' => 60566,
        ]]]);

        $combos = $client->findCombos("Ashnod's Altar");

        $this->assertSame([[
            'otherCards' => ['Pitiless Plunderer'],
            'cardCount' => 2,
            'numDecks' => 60566,
            'produces' => ['Infinite colorless mana'],
            'url' => 'https://commanderspellbook.com/combo/1580-2034-4871/',
        ]], $combos);
    }

    public function testFailedLookupReturnsNullAndIsNotCached(): void
    {
        $calls = 0;
        $failing = function () use (&$calls) {
            $calls++;
            return null;
        };

        $this->assertNull((new CommanderSpellbookClient($failing))->findCombos('Sol Ring'));
        $this->assertNull((new CommanderSpellbookClient($failing))->findCombos('Sol Ring'));

        $this->assertSame(2, $calls, 'a failed lookup must not be cached as "no combos"');
        $this->assertSame(
            0,
            (int) db()->query("SELECT COUNT(*) FROM commander_spellbook_cache WHERE card_name = 'Sol Ring'")->fetchColumn()
        );
    }

    public function testCardWithNoCombosIsCachedAsARealAnswer(): void
    {
        $calls = 0;
        $empty = function () use (&$calls) {
            $calls++;
            return ['results' => []];
        };

        $this->assertSame([], (new CommanderSpellbookClient($empty))->findCombos('Plains'));
        $this->assertSame([], (new CommanderSpellbookClient($empty))->findCombos('Plains'));

        $this->assertSame(1, $calls, '"no combos" is data - the second call should hit the cache');
    }
}
