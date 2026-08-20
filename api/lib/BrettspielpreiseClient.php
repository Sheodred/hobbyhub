<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/Throttle.php';
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';

// #172/docs/adr/0020: a second retail price source, keyed by BGG id directly
// - unlike AmazonRatingClient there is no title-matching heuristic, because
// /api/info takes eid= (the BGG id we already have for every game) and
// returns every offer it knows for that exact item, pre-sorted "SMART"
// (cheapest offer in stock from a local store first). Free, keyless - their
// own terms (https://brettspielpreise.de/api/plugin) ask only for a backlink
// (every offer already carries its own url) and a cache of at least one hour
// - CACHE_TTL_SECONDS is a day, comfortably over that floor.
class BrettspielpreiseClient
{
    private const CACHE_TTL_SECONDS = 24 * 60 * 60;
    // Same as the hit TTL - a miss ("nothing for this id yet") is worth
    // re-checking about as often as a hit is worth refreshing, and this is a
    // free API with no reason to hold a miss for days the way the slower
    // scraped sources do.
    private const MISS_TTL_SECONDS = 24 * 60 * 60;
    private const THROTTLE_MIN_INTERVAL_MS = 500;
    public const INFO_URL = 'https://brettspielpreise.de/api/info';

    /** @var callable */
    private $httpGetJson;

    public function __construct(?callable $httpGetJson = null)
    {
        $this->httpGetJson = $httpGetJson ?? 'http_get_json';
    }

    public function label(): string
    {
        return 'Brettspielpreise.de';
    }

    /**
     * The best offer for a game, by BGG id - "best" is whatever their own
     * SMART sort put first, which is their algorithm to trust, not ours to
     * re-derive. Null when the API has no item for this id.
     *
     * @return array{price:float,currency:string,title:string,url:string}|null
     */
    public function priceFor(int $bggId): ?array
    {
        foreach ($this->itemsFor($bggId) as $item) {
            $offer = ($item['prices'] ?? [])[0] ?? null;
            if ($offer === null || !isset($offer['price'])) {
                continue;
            }
            return [
                'price' => (float) $offer['price'],
                'currency' => 'EUR',
                'title' => (string) ($item['name'] ?? ''),
                'url' => (string) ($offer['link'] ?? $item['url'] ?? ''),
            ];
        }
        return null;
    }

    /**
     * @return array<array{name:?string,url:?string,prices:array}>
     */
    private function itemsFor(int $bggId): array
    {
        return cache_aside('brettspielpreise_cache', 'query_key', (string) $bggId, self::CACHE_TTL_SECONDS, function () use ($bggId) {
            $this->throttle();
            $params = [
                'eid' => $bggId,
                'currency' => 'EUR',
                'destination' => 'DE',
                'sort' => 'SMART',
                'locale' => 'de',
                // Required by their terms - a self-identifying URL, not a
                // secret, and how they know who to credit/contact.
                'sitename' => 'sheoforge.de',
            ];
            $response = ($this->httpGetJson)(
                self::INFO_URL . '?' . http_build_query($params),
                10,
                ['User-Agent: ' . SCRYFALL_USER_AGENT]
            );
            if ($response === null) {
                throw new RuntimeException('brettspielpreise.de request failed for bgg id ' . $bggId);
            }
            $items = $response['items'] ?? [];
            return $items === [] ? null : $items;
        }, self::MISS_TTL_SECONDS) ?? [];
    }

    private function throttle(): void
    {
        throttle('brettspielpreise_throttle', self::THROTTLE_MIN_INTERVAL_MS);
    }
}
