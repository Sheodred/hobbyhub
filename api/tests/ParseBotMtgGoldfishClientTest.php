<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/ParseBotMtgGoldfishClient.php';

// Fixtures follow parse.bot's documented response shape. No live call has
// been made against this API yet (no key), so treat these as the contract we
// believe in, not one we have observed - if the real thing differs, this file
// and the mapping in ParseBotMtgGoldfishClient are what change.
final class ParseBotMtgGoldfishClientTest extends TestCase
{
    private function client(array $data): ParseBotMtgGoldfishClient
    {
        return new ParseBotMtgGoldfishClient(fn() => ['status' => 'success', 'data' => $data]);
    }

    public function testMetagameStripsTheTabFragmentFromArchetypePaths(): void
    {
        $archetypes = $this->client(['archetypes' => [[
            'name' => 'Affinity',
            'archetype_url' => '/archetype/modern-affinity#online',
            'meta_percentage' => '11.5%',
            'num_decks' => 280,
        ]]])->metagame('modern');

        $this->assertSame([[
            'name' => 'Affinity',
            'path' => '/archetype/modern-affinity',
            'metaPercentage' => '11.5%',
            'numDecks' => 280,
        ]], $archetypes);
    }

    public function testArchetypeWithoutAUrlIsSkipped(): void
    {
        $archetypes = $this->client(['archetypes' => [['name' => 'Nameless']]])->metagame('modern');

        $this->assertSame([], $archetypes);
    }

    public function testDeckKeepsCardCountsAndSections(): void
    {
        $deck = $this->client([
            'deck_id' => '7182993',
            'deck_name' => 'Boros Energy',
            'cards' => [
                ['count' => 4, 'name' => 'Ocelot Pride', 'section' => 'Mainboard'],
                ['count' => 2, 'name' => 'Wrath of the Skies', 'section' => 'Sideboard'],
            ],
        ])->deck('7182993');

        $this->assertSame('Boros Energy', $deck['name']);
        $this->assertSame(
            [
                ['name' => 'Ocelot Pride', 'count' => 4, 'section' => 'Mainboard'],
                ['name' => 'Wrath of the Skies', 'count' => 2, 'section' => 'Sideboard'],
            ],
            $deck['cards']
        );
    }

    public function testFailedCallIsNull(): void
    {
        $client = new ParseBotMtgGoldfishClient(fn() => null);

        $this->assertNull($client->metagame('modern'));
        $this->assertNull($client->deck('7182993'));
    }

    // A scrape that fails upstream still answers with HTTP 200 and a body -
    // the status field is the only thing that says it went wrong, and writing
    // its data over a good snapshot would be worse than importing nothing.
    public function testNonSuccessStatusIsTreatedAsFailureNotData(): void
    {
        $client = new ParseBotMtgGoldfishClient(fn() => ['status' => 'error', 'data' => ['archetypes' => []]]);

        $this->assertNull($client->metagame('modern'));
    }
}
