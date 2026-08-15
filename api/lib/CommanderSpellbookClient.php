<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';

// Commander Spellbook (backend.commanderspellbook.com) - the actual combo
// database behind EDHREC's own combo pages, open, no key required. Cached
// per card name (cache-aside, 1h TTL - combos change far less often than
// Scryfall search results do) rather than a scheduled batch job, since
// every card is its own query with no fixed small set to precompute.
class CommanderSpellbookClient
{
    private const MAX_COMBOS = 3;
    private const MAX_PRODUCES_SHOWN = 3;
    private const CACHE_TTL_SECONDS = 3600;

    /** @var callable */
    private $fetch;

    // The User-Agent matters: Commander Spellbook sits behind a CDN that
    // answers 403 to header-less requests from some hosts, which is what a
    // failed lookup looks like from here (null, indistinguishable from
    // "no combos").
    public function __construct(?callable $fetch = null)
    {
        $this->fetch = $fetch ?? fn(string $url) => http_get_json($url, 10, ['User-Agent: ' . SCRYFALL_USER_AGENT]);
    }

    // Null means the lookup failed - distinct from [] ("this card has no
    // combos"), which is a real answer worth caching.
    public function findCombos(string $cardName): ?array
    {
        return cache_aside('commander_spellbook_cache', 'card_name', $cardName, self::CACHE_TTL_SECONDS, function () use ($cardName) {
            $query = 'card:"' . $cardName . '"';
            $json = ($this->fetch)(COMMANDER_SPELLBOOK_BASE_URL . '/variants/?' . http_build_query([
                'q' => $query,
                'limit' => self::MAX_COMBOS,
            ]));

            // Without this, an upstream failure collapses into an empty
            // combo list and cache_aside() stores it as if it were data -
            // pinning "no combos" for the full hour, over and over.
            if ($json === null) {
                return null;
            }

            $combos = [];
            foreach (($json['results'] ?? []) as $variant) {
                $combos[] = $this->toCombo($variant, $cardName);
            }
            return $combos;
        });
    }

    private function toCombo(array $variant, string $searchedCardName): array
    {
        $uses = $variant['uses'] ?? [];
        $otherCards = [];
        foreach ($uses as $use) {
            $name = $use['card']['name'] ?? '';
            if (strcasecmp($name, $searchedCardName) !== 0) {
                $otherCards[] = $name;
            }
        }

        $produces = array_slice(
            array_map(fn($p) => $p['feature']['name'] ?? '', $variant['produces'] ?? []),
            0,
            self::MAX_PRODUCES_SHOWN
        );

        return [
            'otherCards' => $otherCards,
            'cardCount' => count($uses),
            'numDecks' => $variant['popularity'] ?? null,
            'produces' => $produces,
            'url' => 'https://commanderspellbook.com/combo/' . ($variant['id'] ?? '') . '/',
        ];
    }
}
