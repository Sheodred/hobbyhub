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
            $game = $this->lookupFromApi($bggId);
        } catch (RuntimeException $e) {
            // BGG unreachable - answer from the imported ranks dump if it
            // knows this id, otherwise let the failure through as a 502.
            $game = $this->lookupFromRanks($bggId) ?? throw $e;
        }

        // Rank comes from the dump on both paths. The thing endpoint carries
        // its own, but reading it there would make the field appear and
        // disappear with #40 - and this is the one we can actually verify.
        return $game === null ? null : $game + ['rank' => $this->rankFor($bggId)];
    }

    private function rankFor(int $bggId): ?int
    {
        $stmt = db()->prepare('SELECT bgg_rank FROM bgg_ranks WHERE bgg_id = ?');
        $stmt->execute([$bggId]);
        $rank = $stmt->fetchColumn();

        return $rank === false || $rank === null ? null : (int) $rank;
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
        $stmt = db()->prepare('SELECT bgg_id, name, average, users_rated, is_expansion FROM bgg_ranks WHERE bgg_id = ?');
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
            'isExpansion' => (bool) $row['is_expansion'],
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
            $matches = $this->queryRanks('SELECT bgg_id, name, year_published FROM bgg_ranks WHERE name LIKE ? ORDER BY users_rated DESC LIMIT 10', self::escapeLike($normalizedQuery) . '%');
        }
        if ($matches === []) {
            // #73: a query with the punctuation dropped (users have no
            // reason to type it) matches neither pass above, since the dump
            // keeps it in the stored name. Strip ':' '-' ',' and spaces from
            // both sides so "Brass Birmingham" meets "Brass: Birmingham".
            $matches = $this->queryRanks(
                'SELECT bgg_id, name, year_published FROM bgg_ranks WHERE ' . self::strippedNameSql()
                    . ' = ? ORDER BY users_rated DESC LIMIT 10',
                self::stripped($normalizedQuery)
            );
        }

        if ($matches === []) {
            // #92: the dump is BGG's whole catalogue, so if it has rows and
            // none of them match, "no such game" is an answer we can actually
            // stand behind - previously this threw and surfaced as a 502.
            // With an empty dump we still genuinely cannot see, so that stays
            // an error rather than a confident "not found".
            return $this->ranksImported() ? ['status' => 'not_found'] : null;
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

    // Typeahead for the search box, backed by the same dump resolveFromRanks()
    // falls back to - never the live API, so this never throttles or throws.
    // Prefix match on the indexed name column first (same ORDER BY as the
    // ranks fallback, so the game people meant leads); only when that finds
    // nothing does it retry with #73's punctuation-stripped comparison, which
    // can't use the index but only runs on the empty-result path.
    public function suggest(string $query, int $limit = 3): array
    {
        $normalized = strtolower(trim($query));
        if ($normalized === '') {
            return [];
        }

        $matches = $this->queryRanks(
            'SELECT bgg_id, name, year_published FROM bgg_ranks WHERE name LIKE ? ORDER BY users_rated DESC LIMIT ' . $limit,
            self::escapeLike($normalized) . '%'
        );

        if ($matches === []) {
            $stripped = self::stripped($normalized);
            if ($stripped !== '') {
                $matches = $this->queryRanks(
                    'SELECT bgg_id, name, year_published FROM bgg_ranks WHERE ' . self::strippedNameSql()
                        . ' LIKE ? ORDER BY users_rated DESC LIMIT ' . $limit,
                    self::escapeLike($stripped) . '%'
                );
            }
        }

        return array_map(fn(array $row) => [
            'bggId' => (int) $row['bgg_id'],
            'name' => (string) $row['name'],
            'yearPublished' => $row['year_published'] === null ? null : (int) $row['year_published'],
        ], $matches);
    }

    /**
     * The half of a Lookup that costs nothing (#91).
     *
     * Reads only the imported ranks dump - no BGG call, no Rating Source, no
     * throttle - so it answers in milliseconds where a cold full lookup was
     * measured at 4-5s in production. The caller renders this immediately and
     * lets the slow half replace it.
     *
     * 'unavailable' rather than 'not_found' when the dump is empty: with no
     * local catalogue we genuinely cannot see, and saying "no such game"
     * would claim more than we know.
     *
     * @return array{status:'ok',game:array}|array{status:'disambiguation',candidates:array}
     *         |array{status:'not_found'}|array{status:'unavailable'}
     */
    public function lookupLocal(string $query): array
    {
        if (!$this->ranksImported()) {
            return ['status' => 'unavailable'];
        }

        $resolved = $this->resolveFromRanks(strtolower(trim($query)));
        if ($resolved === null || $resolved['status'] === 'not_found') {
            return ['status' => 'not_found'];
        }
        if ($resolved['status'] === 'disambiguation') {
            return $resolved;
        }

        $game = $this->lookupFromRanks($resolved['bggId']);
        if ($game === null) {
            return ['status' => 'not_found'];
        }

        // Every key the full lookup answers with has to be present, even
        // though nothing has filled them yet: the instant answer renders
        // through the same component, so an absent key is undefined.length
        // in the renderer rather than a quietly emptier card.
        return ['status' => 'ok', 'game' => $game + [
            'rank' => $this->rankFor($resolved['bggId']),
            'ratings' => [],
            'bgq' => null,
            'players' => null,
            'duration' => null,
            'age' => null,
            'complexity' => null,
        ]];
    }

    /**
     * BGG's own top games, straight from the imported dump (#102).
     *
     * A way in for a visitor with no particular game in mind, so it has to
     * cost what the dump costs: no external call, no cache, no throttle.
     *
     * ponytail: bgg_rank is unindexed, so this is a full scan + filesort of
     * the 180k dump - measured at 21ms against the real import, inside the
     * ~10-40ms the local endpoints already spend. Add
     * `INDEX idx_bgg_ranks_rank (bgg_rank)` (a hand-applied migration, this
     * repo has no migration runner) if that ever stops being true.
     *
     * `bgg_rank > 0` rather than IS NOT NULL - 0 is how BGG's export spells
     * "unranked". import_bgg_ranks.php normalises that to NULL, but this way
     * a single un-normalised row can't sort ahead of the actual number one.
     *
     * @return list<array{bggId:int,name:string,yearPublished:int|null,rank:int,rating:float|null}>
     */
    public function topRanked(int $limit = 10): array
    {
        $rows = db()->query(
            'SELECT bgg_id, name, year_published, average, bgg_rank FROM bgg_ranks'
                . ' WHERE bgg_rank > 0 ORDER BY bgg_rank ASC LIMIT ' . $limit
        )->fetchAll();

        return array_map(fn(array $row) => [
            'bggId' => (int) $row['bgg_id'],
            'name' => (string) $row['name'],
            'yearPublished' => $row['year_published'] === null ? null : (int) $row['year_published'],
            'rank' => (int) $row['bgg_rank'],
            'rating' => $row['average'] === null ? null : round((float) $row['average'], 1),
        ], $rows);
    }

    /**
     * "Did you mean" candidates for a query that matched nothing (#92).
     *
     * Deliberately not wired into suggest(): that fires per keystroke and
     * must stay on the index, while this only ever runs after a lookup has
     * already failed, so it can afford to be expensive.
     *
     * @return list<array{bggId:int,name:string,yearPublished:int|null}>
     */
    public function didYouMean(string $query, int $limit = 5): array
    {
        $normalized = self::stripped(mb_strtolower(trim($query)));
        if ($normalized === '' || mb_strlen($normalized) > 64) {
            return [];
        }

        // Anchor on the first 3 characters so the index does the narrowing;
        // ranking then only touches a few hundred rows.
        $prefix = mb_substr($normalized, 0, 3);
        $rows = $this->queryRanks(
            'SELECT bgg_id, name, year_published FROM bgg_ranks WHERE ' . self::strippedNameSql()
                . ' LIKE ? ORDER BY users_rated DESC LIMIT 300',
            self::escapeLike($prefix) . '%'
        );

        $ranked = $this->rankByDistance($rows, $normalized, $limit);

        // A typo in those first 3 characters leaves the shortlist empty or
        // useless, and that is a large slice of real typos. Fall back to the
        // most-rated games - somebody misspelling a title is overwhelmingly
        // reaching for one people have heard of.
        // ponytail: full scan on the miss path only, ~110-140ms measured;
        // replace with the normalised/trigram index when #91 lands.
        if ($ranked === [] && mb_strlen($normalized) >= 4) {
            $rows = db()->query(
                'SELECT bgg_id, name, year_published FROM bgg_ranks WHERE users_rated IS NOT NULL'
                    . ' ORDER BY users_rated DESC LIMIT 1000'
            )->fetchAll();
            $ranked = $this->rankByDistance($rows, $normalized, $limit);
        }

        return $ranked;
    }

    private function rankByDistance(array $rows, string $normalizedQuery, int $limit): array
    {
        // Scale the tolerance with the query: 2 edits is generous on a short
        // word and far too strict on a long title.
        $threshold = max(2, (int) floor(mb_strlen($normalizedQuery) * 0.4));

        $scored = [];
        foreach ($rows as $row) {
            $distance = self::editDistance($normalizedQuery, self::stripped((string) $row['name']));
            if ($distance <= $threshold) {
                $scored[] = ['distance' => $distance, 'row' => $row];
            }
        }

        // Closest first; the dump's own popularity order breaks ties, which
        // is why the SQL above already sorted by users_rated.
        usort($scored, fn(array $a, array $b) => $a['distance'] <=> $b['distance']);

        return array_map(fn(array $s) => [
            'bggId' => (int) $s['row']['bgg_id'],
            'name' => (string) $s['row']['name'],
            'yearPublished' => $s['row']['year_published'] === null ? null : (int) $s['row']['year_published'],
        ], array_slice($scored, 0, $limit));
    }

    private function ranksImported(): bool
    {
        return (bool) db()->query('SELECT 1 FROM bgg_ranks LIMIT 1')->fetchColumn();
    }

    // The punctuation a user has no reason to type but the dump still stores.
    // Both resolveFromRanks() and suggest() hand-rolled this same chain; the
    // SQL side of it is stripped_name_sql() so the two can never drift.
    private static function stripped(string $value): string
    {
        return str_replace([':', '-', ',', ' '], '', $value);
    }

    private static function strippedNameSql(): string
    {
        return "REPLACE(REPLACE(REPLACE(REPLACE(name, ':', ''), '-', ''), ',', ''), ' ', '')";
    }

    /**
     * Optimal String Alignment (Damerau-Levenshtein), over codepoints.
     *
     * Not PHP's levenshtein(): that is byte-based, so 'Café' vs 'Cafe' scores
     * 2 rather than 1 and every accented title in the dump ranks worse than
     * it should. It also errors above 255 bytes. Transpositions cost 1 here
     * rather than plain Levenshtein's 2, because a swapped pair is one of the
     * commonest human typos and the whole point of this path is typos.
     */
    private static function editDistance(string $a, string $b): int
    {
        $x = preg_split('//u', mb_strtolower($a), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $y = preg_split('//u', mb_strtolower($b), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $m = count($x);
        $n = count($y);
        if ($m === 0 || $n === 0) {
            return max($m, $n);
        }

        $d = [];
        for ($i = 0; $i <= $m; $i++) {
            $d[$i][0] = $i;
        }
        for ($j = 0; $j <= $n; $j++) {
            $d[0][$j] = $j;
        }

        for ($i = 1; $i <= $m; $i++) {
            for ($j = 1; $j <= $n; $j++) {
                $cost = $x[$i - 1] === $y[$j - 1] ? 0 : 1;
                $d[$i][$j] = min($d[$i - 1][$j] + 1, $d[$i][$j - 1] + 1, $d[$i - 1][$j - 1] + $cost);
                // The OSA transposition case - adjacent pair swapped.
                if ($i > 1 && $j > 1 && $x[$i - 1] === $y[$j - 2] && $x[$i - 2] === $y[$j - 1]) {
                    $d[$i][$j] = min($d[$i][$j], $d[$i - 2][$j - 2] + 1);
                }
            }
        }

        return $d[$m][$n];
    }

    // '%' and '_' are LIKE metacharacters, so an unescaped one turns an
    // indexed prefix scan into a match-everything scan of the whole 180k-row
    // dump - on suggest(), which fires per keystroke. Binding the parameter
    // stops SQL injection but not this: the wildcard is data, and data is
    // exactly what gets bound. Backslash goes first or it would double-escape
    // the escapes added after it.
    private static function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
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
            // BGG models an expansion as its own thing type rather than a
            // flag, so the answer is already here - no second request.
            'isExpansion' => (string) $item['type'] === 'boardgameexpansion',
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
