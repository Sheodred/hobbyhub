<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';

// Combos for a single card, from EDHREC's open JSON API. The data originates
// at Commander Spellbook either way - EDHREC's combo pages are built on it -
// but backend.commanderspellbook.com answers 403 to every request from the
// production host, while json.edhrec.com already serves the MTG Meta widgets
// from there (issue #35, EdhrecClient).
//
// Kept separate from EdhrecClient: that one throws on failure so a cron run
// can keep the previous snapshot, this one is cached per card and has to tell
// "no combos" apart from "the lookup broke".
class EdhrecComboClient
{
    private const MAX_COMBOS = 3;
    private const MAX_PRODUCES_SHOWN = 3;
    private const CACHE_TTL_SECONDS = 3600;

    /** @var callable */
    private $fetch;

    public function __construct(?callable $fetch = null)
    {
        $this->fetch = $fetch ?? fn(string $url) => http_get_result($url, 10, [
            'Accept: application/json',
            'User-Agent: ' . SCRYFALL_USER_AGENT,
        ]);
    }

    // Null means the lookup failed - distinct from [] ("this card has no
    // combos"), which is a real answer worth caching.
    public function findCombos(string $cardName): ?array
    {
        // Still the commander_spellbook_cache table: same shape, same rows,
        // and renaming it would mean a hand-run migration on a production DB
        // that is unreachable from outside IONOS (ADR-0015).
        return cache_aside('commander_spellbook_cache', 'card_name', $cardName, self::CACHE_TTL_SECONDS, function () use ($cardName) {
            $result = ($this->fetch)(EDHREC_JSON_BASE_URL . '/pages/combos/' . self::slug($cardName) . '.json');

            // EDHREC serves these as static files, so a card that is in no
            // combo has no file and comes back 403 (not 404). That is a real
            // answer. Anything else - timeout, 5xx, unparseable body - stays
            // null so cache_aside() doesn't pin a failure for the hour.
            if ($result['status'] === 403 || $result['status'] === 404) {
                return [];
            }
            if ($result['body'] === null || $result['status'] >= 400) {
                return null;
            }
            $json = json_decode($result['body'], true);
            if (!is_array($json)) {
                return null;
            }

            $cardlists = array_slice($json['container']['json_dict']['cardlists'] ?? [], 0, self::MAX_COMBOS);
            return array_map(fn(array $cardlist) => $this->toCombo($cardlist), $cardlists);
        });
    }

    // One cardlist per combo: cardviews are the other cards (EDHREC already
    // drops the card being looked up), and .combo carries the rest.
    private function toCombo(array $cardlist): array
    {
        $combo = $cardlist['combo'] ?? [];

        return [
            'otherCards' => array_map(fn($view) => [
                'name' => $view['name'] ?? '',
                'imageUrl' => self::cardImageUrl($view['id'] ?? ''),
            ], $cardlist['cardviews'] ?? []),
            'cardCount' => count($combo['cardIds'] ?? []),
            'numDecks' => $combo['count'] ?? null,
            'produces' => array_slice($combo['results'] ?? [], 0, self::MAX_PRODUCES_SHOWN),
            'url' => 'https://edhrec.com' . ($cardlist['href'] ?? ''),
        ];
    }

    // EDHREC's cardview id is the Scryfall card id, so a thumbnail costs no
    // extra lookup: Scryfall's CDN fans its image paths out on the first two
    // characters of that id. Null for anything that isn't one.
    private static function cardImageUrl(string $scryfallId): ?string
    {
        if (strlen($scryfallId) < 2) {
            return null;
        }

        return "https://cards.scryfall.io/small/front/{$scryfallId[0]}/{$scryfallId[1]}/{$scryfallId}.jpg";
    }

    // EDHREC's own slug form: apostrophes vanish rather than becoming a
    // separator ("Hidetsugu's Second Rite" -> hidetsugus-second-rite), then
    // anything else non-alphanumeric turns into a single hyphen.
    // ponytail: names outside a-z0-9 after that (split cards, accents) slug
    // to a 403 and render as "no combos" - fix if a real card shows up wrong.
    private static function slug(string $cardName): string
    {
        $withoutApostrophes = str_replace(["'", "\u{2019}"], '', mb_strtolower($cardName));

        return trim(preg_replace('/[^a-z0-9]+/', '-', $withoutApostrophes), '-');
    }
}
