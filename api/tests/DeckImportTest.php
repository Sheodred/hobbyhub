<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/DeckImport.php';

final class DeckImportTest extends TestCase
{
    private const DECK = ['deckId' => '7182993', 'name' => 'Boros Energy', 'pilot' => 'A. Pilot', 'event' => 'RC Dortmund', 'url' => '/deck/7182993'];

    protected function setUp(): void
    {
        db()->exec('DELETE FROM mtg_deck_cards');
        db()->exec('DELETE FROM mtg_decks');
    }

    private function store(array $cards): bool
    {
        return store_deck(db(), self::DECK, $cards, 'modern', 'Boros Energy', '/archetype/modern-boros-energy', 0);
    }

    public function testStoresDeckWithItsCards(): void
    {
        $this->assertTrue($this->store([
            ['name' => 'Ocelot Pride', 'count' => 4, 'section' => 'Mainboard'],
            ['name' => 'Wrath of the Skies', 'count' => 2, 'section' => 'Sideboard'],
        ]));

        $this->assertTrue(deck_already_imported(db(), '7182993'));
        $this->assertSame(
            2,
            (int) db()->query("SELECT COUNT(*) FROM mtg_deck_cards WHERE deck_id = '7182993'")->fetchColumn()
        );
    }

    public function testDeckWithNoCardsIsNotStored(): void
    {
        $this->assertFalse($this->store([]));
        $this->assertFalse(deck_already_imported(db(), '7182993'));
    }

    public function testReimportingReplacesCardsInsteadOfDuplicatingThem(): void
    {
        $this->store([['name' => 'Ocelot Pride', 'count' => 4, 'section' => 'Mainboard']]);
        $this->store([
            ['name' => 'Ocelot Pride', 'count' => 3, 'section' => 'Mainboard'],
            ['name' => 'Static Prison', 'count' => 1, 'section' => 'Mainboard'],
        ]);

        $rows = db()->query("SELECT name, count FROM mtg_deck_cards WHERE deck_id = '7182993' ORDER BY sort_order")->fetchAll();
        $this->assertSame(
            [['Ocelot Pride', 3], ['Static Prison', 1]],
            array_map(fn($r) => [$r['name'], (int) $r['count']], $rows)
        );
    }
}
