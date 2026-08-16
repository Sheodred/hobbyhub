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
            return array_map(fn(array $cardlist) => $this->toCombo($cardlist, self::frontFace($cardName)), $cardlists);
        });
    }

    // One cardlist per combo: cardviews are the other cards and .combo carries
    // the rest. EDHREC drops the card being looked up from cardviews itself -
    // but only when its own name matches the page, so a double-faced card
    // (page "birgi-god-of-storytelling", card "Birgi ... // Harnfel ...")
    // comes back listing itself. Drop it here rather than trusting them to.
    private function toCombo(array $cardlist, string $searchedFrontFace): array
    {
        $combo = $cardlist['combo'] ?? [];
        $otherViews = array_filter(
            $cardlist['cardviews'] ?? [],
            fn($view) => strcasecmp($view['name'] ?? '', $searchedFrontFace) !== 0
        );

        return [
            'otherCards' => array_values(array_map(fn($view) => [
                'name' => $view['name'] ?? '',
                'imageUrl' => self::cardImageUrl($view['id'] ?? ''),
            ], $otherViews)),
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

    // EDHREC folds accents to their ASCII base rather than dropping them, and
    // expands ligatures to two letters - "Márton Stromgald" is
    // marton-stromgald, "Æther Vial" is aether-vial (ae-ther-vial 403s).
    // Written out instead of iconv('ASCII//TRANSLIT'): that one's output is
    // locale-dependent, and on a host whose libc resolves the locale
    // differently it degrades to '?' or '"o' silently - which here would look
    // exactly like the bug it was meant to fix (#42). Keys are lowercase
    // because the fold runs after mb_strtolower().
    private const ASCII_FOLD = [
        'á' => 'a', 'à' => 'a', 'â' => 'a', 'ä' => 'a', 'ã' => 'a', 'å' => 'a',
        'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
        'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'ö' => 'o', 'õ' => 'o', 'ø' => 'o', 'ō' => 'o',
        'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ū' => 'u',
        'ñ' => 'n', 'ç' => 'c', 'ý' => 'y',
        'æ' => 'ae', 'œ' => 'oe', 'ß' => 'ss',
    ];

    // EDHREC's own slug form: accents fold (above), apostrophes vanish rather
    // than becoming a separator ("Hidetsugu's Second Rite" ->
    // hidetsugus-second-rite), then anything else non-alphanumeric turns into
    // a single hyphen. Anything still outside a-z0-9 after the fold - a
    // script we have no mapping for - hyphenates as before and 403s, which
    // reads as "no combos"; that is the old behaviour, not a new failure.
    private static function slug(string $cardName): string
    {
        $folded = strtr(mb_strtolower(self::frontFace($cardName)), self::ASCII_FOLD);
        $withoutApostrophes = str_replace(["'", "\u{2019}"], '', $folded);

        return trim(preg_replace('/[^a-z0-9]+/', '-', $withoutApostrophes), '-');
    }

    // EDHREC indexes combos under the front face alone: every back face 403s
    // and the full "A // B" name has no page at all, so using the whole name
    // made every multi-faced card look comboless (#34).
    private static function frontFace(string $cardName): string
    {
        return trim(explode('//', $cardName)[0]);
    }
}
