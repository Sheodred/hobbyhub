<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/Throttle.php';
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';
require_once __DIR__ . '/RatingSource.php';

// Reads the aggregate customer rating for a board game from amazon.de search
// results - the single star average and its rating count, both plain facts,
// never any review text (see docs/adr/0012).
//
// One request per uncached lookup: the search result block already carries
// the rating, so there is no need to follow through to the product page.
// robots.txt for User-agent: * disallows neither /s nor /dp (checked
// 2026-08-15, recorded in the ADR); requests identify themselves with the
// project's real User-Agent and are throttled well below any browsing rate.
class AmazonRatingClient implements RatingSource
{
    private const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // ratings drift slowly
    // A game with no listing today may be listed next week - and this is the
    // slowest source of the four, so not re-asking matters most here.
    private const MISS_TTL_SECONDS = 3 * 24 * 60 * 60;
    private const THROTTLE_MIN_INTERVAL_MS = 2000;      // deliberately slow
    private const SEARCH_URL = 'https://www.amazon.de/s';

    /** @var callable */
    private $httpGetHtml;

    public function __construct(?callable $httpGetHtml = null)
    {
        $this->httpGetHtml = $httpGetHtml ?? 'http_get_html';
    }

    public function label(): string
    {
        return 'Amazon.de';
    }

    // Amazon publishes out of 5. The customer-review count is worth carrying:
    // it is the one number that says how much the score is worth.
    public function rating(string $gameName): ?array
    {
        $found = $this->ratingFor($gameName);

        return $found === null ? null : [
            'value' => $found['rating'],
            'max' => 5,
            'count' => $found['count'],
            'title' => $found['title'],
            'url' => $found['url'],
        ];
    }

    /**
     * @return array{rating:float,count:?int,title:string,url:string}|null
     */
    public function ratingFor(string $gameName): ?array
    {
        $normalized = strtolower(trim($gameName));
        if ($normalized === '') {
            return null;
        }

        return cache_aside('amazon_rating_cache', 'query_key', $normalized, self::CACHE_TTL_SECONDS, function () use ($gameName) {
            $this->throttle();
            // amazon.de answers a request with no Accept/Accept-Language at
            // all with its generic error page - these are ordinary content
            // negotiation, sent alongside the project's real User-Agent.
            $html = ($this->httpGetHtml)(
                self::SEARCH_URL . '?' . http_build_query(['k' => $gameName . ' brettspiel']),
                15,
                ['Accept: text/html,application/xhtml+xml', 'Accept-Language: de-DE,de;q=0.9']
            );
            if ($html === null) {
                // Failed call. A null here would be stored as "amazon.de lists
                // nothing for this game" - see Cache.php.
                throw new RuntimeException('amazon.de request failed for ' . $gameName);
            }
            return $this->parseSearchHtml($html, $gameName);
        }, self::MISS_TTL_SECONDS);
    }

    /**
     * Public for testing the parser against captured markup without a fetch.
     *
     * @return array{rating:float,count:?int,title:string,url:string}|null
     */
    public function parseSearchHtml(string $html, string $gameName): ?array
    {
        $terms = $this->significantTerms($gameName);
        if ($terms === []) {
            return null;
        }

        foreach (explode('data-component-type="s-search-result"', $html) as $block) {
            // Sponsored placements are ordinary result blocks carrying
            // AdHolder. They are adverts for whatever Amazon was paid to
            // show - frequently a different game entirely - so their rating
            // must never be presented as this game's. Skipping them is the
            // whole reason this parser exists rather than "take the first
            // data-asin".
            if (str_contains($block, 'AdHolder')) {
                continue;
            }
            if (!preg_match('/<h2[^>]*><span>(.*?)<\/span><\/h2>/is', $block, $titleMatch)) {
                continue;
            }
            $title = trim(html_entity_decode(strip_tags($titleMatch[1]), ENT_QUOTES));
            if (!$this->titleMatches($title, $terms)) {
                continue;
            }
            if (!preg_match('/(\d[,.]\d)\s*von\s*5\s*Sternen/i', $block, $ratingMatch)) {
                continue;
            }
            $asin = $this->asinFor($html, $block);
            if ($asin === null) {
                continue;
            }

            return [
                'rating' => (float) str_replace(',', '.', $ratingMatch[1]),
                'count' => $this->parseCount($block),
                'title' => $title,
                'url' => 'https://www.amazon.de/dp/' . $asin,
            ];
        }

        return null;
    }

    // The asin attribute sits just before the split marker, so it lands at
    // the tail of the PREVIOUS chunk rather than inside this one. That window
    // also contains the previous product's asin, so take the last match, not
    // the first - taking the first attributes this block's rating to the
    // product above it.
    private function asinFor(string $html, string $block): ?string
    {
        $pos = strpos($html, $block);
        $window = $pos === false ? $block : substr($html, max(0, $pos - 400), 400);
        if (!preg_match_all('/data-asin="([A-Z0-9]{10})"/', $window, $matches)) {
            return null;
        }
        return end($matches[1]);
    }

    // Rating count is a nice-to-have: never fail a usable rating over it.
    // The count is exposed on the review link's aria-label ("257 Bewertungen")
    // - the visible node around it is styled markup that changes often.
    private function parseCount(string $block): ?int
    {
        if (!preg_match('/aria-label="([\d.,]+)\s*(?:Sternebewertungen|Bewertungen)/i', $block, $m)) {
            return null;
        }
        $digits = preg_replace('/\D/', '', $m[1]);
        return $digits === '' ? null : (int) $digits;
    }

    /** @return string[] */
    private function significantTerms(string $gameName): array
    {
        $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($gameName), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        return array_values(array_filter($words, fn(string $w) => mb_strlen($w) >= 3));
    }

    /** @param string[] $terms */
    private function titleMatches(string $title, array $terms): bool
    {
        $haystack = mb_strtolower($title);
        foreach ($terms as $term) {
            if (!str_contains($haystack, $term)) {
                return false;
            }
        }
        return true;
    }

    private function throttle(): void
    {
        throttle('amazon_throttle', self::THROTTLE_MIN_INTERVAL_MS);
    }
}
