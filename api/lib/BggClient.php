<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';

// On-demand cache-aside proxy to BoardGameGeek's XML API2 (docs/adr/0011).
// Two-level cache: bgg_search_cache (free-text query -> resolved bgg_id) and
// bgg_lookup_cache (bgg_id -> synthesized game data). Both long-TTL since
// board game ratings and descriptions change far more slowly than MTG
// Standard metagame data (contrast with ScryfallClient's 5-minute TTL).
// Throttled the same way ScryfallClient is, tuned to BGG's ~2 req/sec
// community-observed convention (not officially documented by BGG -
// best-effort, same as Scryfall's own guideline).
class BggClient
{
    private const LOOKUP_CACHE_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days
    private const SEARCH_CACHE_TTL_SECONDS = 14 * 24 * 60 * 60;
    private const THROTTLE_MIN_INTERVAL_MS = 500; // ~2 req/sec
    private const BASE_URL = 'https://boardgamegeek.com/xmlapi2';
    private const MAX_COMMENTS = 100; // one page - see pickGoodBad()

    /** @var callable */
    private $httpGetXml;

    public function __construct(?callable $httpGetXml = null)
    {
        $this->httpGetXml = $httpGetXml ?? 'http_get_xml';
    }

    public function lookup(int $bggId): ?array
    {
        return $this->cached($bggId, function () use ($bggId) {
            $this->throttle();
            $xml = ($this->httpGetXml)(self::BASE_URL . '/thing?' . http_build_query([
                'id' => $bggId,
                'stats' => 1,
                'comments' => 1,
                'ratingcomments' => 1,
                'pagesize' => self::MAX_COMMENTS,
            ]));
            if ($xml === null) {
                // Failed call, not an answer - see resolveSearch().
                throw new RuntimeException('BGG thing request failed for id ' . $bggId);
            }
            if (!isset($xml->item)) {
                return null; // BGG answered: no game with that id.
            }
            return $this->mapThing($xml->item);
        });
    }

    /**
     * @return array{status:'ok',bggId:int}|array{status:'disambiguation',candidates:array}|array{status:'not_found'}
     */
    public function resolveSearch(string $query): array
    {
        $normalized = strtolower(trim($query));

        $stmt = db()->prepare('SELECT bgg_id FROM bgg_search_cache WHERE query_key = ? AND expires_at > NOW()');
        $stmt->execute([$normalized]);
        $row = $stmt->fetch();
        if ($row) {
            return ['status' => 'ok', 'bggId' => (int) $row['bgg_id']];
        }

        $this->throttle();
        $xml = ($this->httpGetXml)(self::BASE_URL . '/search?' . http_build_query(['type' => 'boardgame', 'query' => $query]));
        // A null here means the HTTP call itself failed - BGG returns 401
        // without a registered application token, and http_get_xml() gives
        // back the same null it would for a timeout or a 5xx. Reporting that
        // as "no such game" would be a wrong answer rather than an error, so
        // throw and let the endpoint answer 502.
        if ($xml === null) {
            throw new RuntimeException('BGG search request failed');
        }
        $items = $xml->item;
        $count = count($items);

        if ($count === 0) {
            return ['status' => 'not_found'];
        }

        if ($count === 1) {
            $bggId = (int) $items[0]['id'];
            $this->cacheResolvedSearch($normalized, $bggId);
            return ['status' => 'ok', 'bggId' => $bggId];
        }

        $candidates = [];
        foreach ($items as $item) {
            $candidates[] = [
                'bggId' => (int) $item['id'],
                'name' => (string) ($item->name['value'] ?? ''),
                'yearPublished' => isset($item->yearpublished) ? (int) $item->yearpublished['value'] : null,
            ];
        }
        // Deliberately not cached - an ambiguous query has no single
        // bgg_id to store against bgg_search_cache's one-id-per-query
        // shape, and the disambiguation list itself is cheap to
        // re-fetch (it's only shown once per genuinely ambiguous title).
        return ['status' => 'disambiguation', 'candidates' => $candidates];
    }

    private function cacheResolvedSearch(string $normalizedQuery, int $bggId): void
    {
        $stmt = db()->prepare(
            'REPLACE INTO bgg_search_cache (query_key, bgg_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))'
        );
        $stmt->execute([$normalizedQuery, $bggId, self::SEARCH_CACHE_TTL_SECONDS]);
    }

    private function mapThing(SimpleXMLElement $item): array
    {
        $name = '';
        foreach ($item->name as $n) {
            if ((string) $n['type'] === 'primary') {
                $name = (string) $n['value'];
                break;
            }
        }
        [$good, $bad] = $this->pickGoodBad($item->comments->comment ?? []);
        $bggId = (int) $item['id'];

        return [
            'bggId' => $bggId,
            'name' => $name,
            'description' => html_entity_decode(strip_tags((string) $item->description), ENT_QUOTES),
            'rating' => isset($item->statistics->ratings->average) ? round((float) $item->statistics->ratings->average['value'], 1) : null,
            'numRatings' => isset($item->statistics->ratings->usersrated) ? (int) $item->statistics->ratings->usersrated['value'] : null,
            'good' => $good,
            'bad' => $bad,
            'source' => ['name' => 'BoardGameGeek', 'url' => 'https://boardgamegeek.com/boardgame/' . $bggId],
        ];
    }

    // Best-effort: picks the highest- and lowest-rated comment from the
    // single page of up to MAX_COMMENTS returned by the thing endpoint -
    // NOT a guaranteed global max/min across every rating BGG holds (the
    // API has no "sort comments by rating" option). Good enough for a
    // short "good vs. bad" snippet without a second data source or an
    // LLM call; upgrade to paging through all comments if this proves
    // too shallow in practice.
    private function pickGoodBad(iterable $comments): array
    {
        $best = null;
        $worst = null;
        foreach ($comments as $comment) {
            $rating = (float) $comment['rating'];
            $text = trim((string) $comment['value']);
            if ($text === '' || $rating <= 0) {
                continue; // BGG uses a non-numeric rating for comments with no rating
            }
            if ($best === null || $rating > $best['rating']) {
                $best = ['rating' => $rating, 'text' => $text];
            }
            if ($worst === null || $rating < $worst['rating']) {
                $worst = ['rating' => $rating, 'text' => $text];
            }
        }
        return [
            $best ? $this->truncate($best['text']) : null,
            ($worst && $worst !== $best) ? $this->truncate($worst['text']) : null,
        ];
    }

    private function truncate(string $text, int $maxLength = 280): string
    {
        return mb_strlen($text) <= $maxLength ? $text : mb_substr($text, 0, $maxLength) . '…';
    }

    private function cached(int $bggId, callable $fetch): ?array
    {
        return cache_aside('bgg_lookup_cache', 'bgg_id', (string) $bggId, self::LOOKUP_CACHE_TTL_SECONDS, $fetch);
    }

    private function throttle(): void
    {
        $pdo = db();
        $stmt = $pdo->query('SELECT last_call_at FROM bgg_throttle WHERE id = 1');
        $row = $stmt->fetch();

        $now = microtime(true);
        if ($row) {
            $elapsedMs = ($now - (float) $row['last_call_at']) * 1000;
            if ($elapsedMs < self::THROTTLE_MIN_INTERVAL_MS) {
                usleep((int) ((self::THROTTLE_MIN_INTERVAL_MS - $elapsedMs) * 1000));
            }
        }

        $now = microtime(true);
        $stmt = $pdo->prepare(
            'INSERT INTO bgg_throttle (id, last_call_at) VALUES (1, ?) ON DUPLICATE KEY UPDATE last_call_at = ?'
        );
        $stmt->execute([$now, $now]);
    }
}
