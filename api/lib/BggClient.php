<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/Throttle.php';
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
    private string $apiToken;

    public function __construct(?callable $httpGetXml = null, ?string $apiToken = null)
    {
        $this->httpGetXml = $httpGetXml ?? 'http_get_xml';
        $this->apiToken = $apiToken ?? (defined('BGG_API_TOKEN') ? BGG_API_TOKEN : '');
    }

    // BGG rejects unauthenticated calls with 401 since it started requiring
    // registered applications (#40). The scheme below is the conventional
    // bearer form - CONFIRM IT against BGG's own docs when the token arrives
    // (their pages 403 non-browser clients, so it could not be read from
    // here). If they use a different scheme, this one line is the change.
    private function authHeaders(): array
    {
        return $this->apiToken === '' ? [] : ['Authorization: Bearer ' . $this->apiToken];
    }

    public function lookup(int $bggId): ?array
    {
        try {
            return $this->lookupFromApi($bggId);
        } catch (RuntimeException $e) {
            // BGG unreachable - answer from the imported ranks dump if it
            // knows this id, otherwise let the failure through as a 502.
            return $this->lookupFromRanks($bggId) ?? throw $e;
        }
    }

    private function lookupFromApi(int $bggId): ?array
    {
        return $this->cached($bggId, function () use ($bggId) {
            $this->throttle();
            $xml = ($this->httpGetXml)(self::BASE_URL . '/thing?' . http_build_query([
                'id' => $bggId,
                'stats' => 1,
                'comments' => 1,
                'ratingcomments' => 1,
                'pagesize' => self::MAX_COMMENTS,
            ]), 10, $this->authHeaders());
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

        try {
            return $this->resolveSearchViaApi($query, $normalized);
        } catch (RuntimeException $e) {
            return $this->resolveFromRanks($normalized) ?? throw $e;
        }
    }

    private function resolveSearchViaApi(string $query, string $normalized): array
    {
        $this->throttle();
        $xml = ($this->httpGetXml)(self::BASE_URL . '/search?' . http_build_query(['type' => 'boardgame', 'query' => $query]), 10, $this->authHeaders());
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

    // --- Local fallback, backed by the imported boardgames_ranks.csv -------
    //
    // The dump carries names and ratings for BGG's whole catalog but no
    // descriptions and no comments, so anything answered from here is marked
    // partial and is never written to bgg_lookup_cache: a 14-day cache entry
    // would outlive the outage that produced it, and would keep serving the
    // thinner answer long after the live API came back.

    private function lookupFromRanks(int $bggId): ?array
    {
        $stmt = db()->prepare('SELECT bgg_id, name, average, users_rated FROM bgg_ranks WHERE bgg_id = ?');
        $stmt->execute([$bggId]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        return [
            'bggId' => (int) $row['bgg_id'],
            'name' => (string) $row['name'],
            'description' => '',
            'rating' => $row['average'] === null ? null : round((float) $row['average'], 1),
            'numRatings' => $row['users_rated'] === null ? null : (int) $row['users_rated'],
            'good' => null,
            'bad' => null,
            'partial' => true,
            'source' => ['name' => 'BoardGameGeek', 'url' => 'https://boardgamegeek.com/boardgame/' . (int) $row['bgg_id']],
        ];
    }

    /**
     * @return array{status:'ok',bggId:int}|array{status:'disambiguation',candidates:array}|null
     */
    private function resolveFromRanks(string $normalizedQuery): ?array
    {
        // Exact name first, then a prefix search - two plain queries rather
        // than one ranked query, because "which one did it actually match"
        // stays obvious when this is debugged at 3am.
        $matches = $this->queryRanks('SELECT bgg_id, name, year_published FROM bgg_ranks WHERE name = ? ORDER BY users_rated DESC LIMIT 10', $normalizedQuery);
        if ($matches === []) {
            $matches = $this->queryRanks('SELECT bgg_id, name, year_published FROM bgg_ranks WHERE name LIKE ? ORDER BY users_rated DESC LIMIT 10', $normalizedQuery . '%');
        }

        if ($matches === []) {
            // Can't confirm the game doesn't exist - only that we can't see
            // it. That's an error, not a "not_found" answer.
            return null;
        }

        if (count($matches) === 1) {
            return ['status' => 'ok', 'bggId' => (int) $matches[0]['bgg_id']];
        }

        return [
            'status' => 'disambiguation',
            'candidates' => array_map(fn(array $row) => [
                'bggId' => (int) $row['bgg_id'],
                'name' => (string) $row['name'],
                'yearPublished' => $row['year_published'] === null ? null : (int) $row['year_published'],
            ], $matches),
        ];
    }

    private function queryRanks(string $sql, string $param): array
    {
        $stmt = db()->prepare($sql);
        $stmt->execute([$param]);
        return $stmt->fetchAll();
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
            'partial' => false,
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
        throttle('bgg_throttle', self::THROTTLE_MIN_INTERVAL_MS);
    }
}
