<?php
require_once __DIR__ . '/http_client.php';

// parse.bot's managed wrapper over mtggoldfish.com - not an official
// MTGGoldfish API (they don't publish one). Used only by the deck importer,
// never from a request path: the free tier allows 200 calls a month, so
// every call here is spent deliberately by a human running the import.
//
// Every response is {"status": "success", "data": {...}}; this class is the
// only place that shape is known, so a change upstream is one file to fix.
class ParseBotMtgGoldfishClient
{
    /** @var callable */
    private $fetch;

    public function __construct(?callable $fetch = null)
    {
        $this->fetch = $fetch ?? fn(string $url) => http_get_json($url, 30, [
            'X-API-Key: ' . PARSE_BOT_API_KEY,
            'User-Agent: ' . SCRYFALL_USER_AGENT,
        ]);
    }

    // Archetypes for a format, most-played first, as the site stores them.
    public function metagame(string $format): ?array
    {
        $data = $this->get('get_metagame', ['format' => $format]);
        if ($data === null) {
            return null;
        }

        $archetypes = [];
        foreach (($data['archetypes'] ?? []) as $archetype) {
            $path = $archetype['archetype_url'] ?? '';
            if ($path === '') {
                continue;
            }
            $archetypes[] = [
                'name' => $archetype['name'] ?? '',
                // "/archetype/modern-affinity#online" - the fragment is a tab
                // selector on their site and is not part of the identity.
                'path' => strtok($path, '#'),
                'metaPercentage' => $archetype['meta_percentage'] ?? null,
                'numDecks' => isset($archetype['num_decks']) ? (int) $archetype['num_decks'] : null,
            ];
        }

        return $archetypes;
    }

    public function archetypeDecks(string $path): ?array
    {
        $data = $this->get('get_archetype_decks', ['path' => $path]);
        if ($data === null) {
            return null;
        }

        $decks = [];
        foreach (($data['decks'] ?? $data) as $deck) {
            if (!is_array($deck) || !isset($deck['deck_id'])) {
                continue;
            }
            $decks[] = [
                'deckId' => (string) $deck['deck_id'],
                'name' => $deck['name'] ?? '',
                'pilot' => $deck['pilot'] ?? null,
                'event' => $deck['event'] ?? null,
                'url' => $deck['url'] ?? null,
            ];
        }

        return $decks;
    }

    // Mainboard/sideboard card list for one deck. Card names are kept exactly
    // as MTGGoldfish spells them - the frontend looks each one up by name
    // against Scryfall, which is the same spelling.
    public function deck(string $deckId): ?array
    {
        $data = $this->get('get_deck', ['deck_id' => $deckId]);
        if ($data === null) {
            return null;
        }

        $cards = [];
        foreach (($data['cards'] ?? []) as $card) {
            $name = $card['name'] ?? '';
            if ($name === '') {
                continue;
            }
            $cards[] = [
                'name' => $name,
                'count' => (int) ($card['count'] ?? 1),
                'section' => $card['section'] ?? 'Mainboard',
            ];
        }

        return [
            'deckId' => (string) ($data['deck_id'] ?? $deckId),
            'name' => $data['deck_name'] ?? '',
            'cards' => $cards,
        ];
    }

    private function get(string $endpoint, array $params): ?array
    {
        $json = ($this->fetch)(PARSE_BOT_BASE_URL . '/' . $endpoint . '?' . http_build_query($params));

        // Null is a failed call; a non-success status is their way of saying
        // the scrape itself failed. Neither is data, and the importer must
        // not write either one over a good snapshot.
        if ($json === null || ($json['status'] ?? '') !== 'success') {
            return null;
        }

        return $json['data'] ?? null;
    }
}
