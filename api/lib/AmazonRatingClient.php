<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/Throttle.php';
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';
require_once __DIR__ . '/RatingSource.php';

// Reads the aggregate customer rating, and separately the displayed retail
// price, for a board game from amazon.de search results - both plain facts
// already on the page, never any review text (docs/adr/0012, docs/adr/0018).
//
// One request per uncached lookup: the search result block already carries
// both, so there is no need to follow through to the product page.
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
    // public so health.php's #165 probe asks the same URL this client asks -
    // a probe that drifts from the real request measures nothing.
    public const SEARCH_URL = 'https://www.amazon.de/s';

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
        foreach ($this->candidatesFor($gameName) as $candidate) {
            if ($candidate['rating'] === null) {
                continue;
            }
            return [
                'rating' => $candidate['rating'],
                'count' => $candidate['count'],
                'title' => $candidate['title'],
                'url' => $candidate['url'],
            ];
        }
        return null;
    }

    // #90: the retail price shown on the same page a rating already comes
    // from - a new listing has no reviews yet but still has a price, so this
    // walks the same candidate list independently of ratingFor() rather than
    // requiring both on one block.
    //
    // @return array{price:float,currency:string,title:string,url:string}|null
    public function priceFor(string $gameName): ?array
    {
        foreach ($this->candidatesFor($gameName) as $candidate) {
            if ($candidate['price'] === null) {
                continue;
            }
            return [
                'price' => $candidate['price'],
                'currency' => 'EUR',
                'title' => $candidate['title'],
                'url' => $candidate['url'],
            ];
        }
        return null;
    }

    /**
     * Every title-matching, non-sponsored result on the page, in the order
     * amazon.de shows them - one fetch serves both ratingFor() and
     * priceFor(), each picking the first candidate that has the field it
     * needs, since not every candidate carries both.
     *
     * @return array<array{title:string,url:string,rating:?float,count:?int,price:?float}>
     */
    private function candidatesFor(string $gameName): array
    {
        $normalized = strtolower(trim($gameName));
        if ($normalized === '') {
            return [];
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
            $candidates = $this->parseSearchHtml($html, $gameName);
            // Their anti-bot interstitial comes back with a 200, so "nothing
            // listed for this game" and "we were blocked" look the same from
            // here. Only the page that is recognisably a search result page
            // gets to answer "nothing" - otherwise a block would hide every
            // game's rating and price for the miss TTL and outlive the block.
            if ($candidates === [] && !str_contains($html, 's-search-result')) {
                throw new RuntimeException('amazon.de answered 200 without a search result page for ' . $gameName);
            }
            // cache_aside() only miss-caches a null result (Cache.php); an
            // empty list has to become null here or "genuinely nothing
            // matched" would be cached under the long hit TTL instead of the
            // short miss TTL.
            return $candidates === [] ? null : $candidates;
        }, self::MISS_TTL_SECONDS) ?? [];
    }

    /**
     * Public for testing the parser against captured markup without a fetch.
     *
     * @return array<array{title:string,url:string,rating:?float,count:?int,price:?float}>
     */
    public function parseSearchHtml(string $html, string $gameName): array
    {
        $terms = $this->significantTerms($gameName);
        if ($terms === []) {
            return [];
        }

        $candidates = [];

        foreach (explode('data-component-type="s-search-result"', $html) as $block) {
            // Sponsored placements are ordinary result blocks carrying
            // AdHolder. They are adverts for whatever Amazon was paid to
            // show - frequently a different game entirely - so their rating
            // and price must never be presented as this game's. Skipping
            // them is the whole reason this parser exists rather than "take
            // the first data-asin".
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
            $asin = $this->asinFor($html, $block);
            if ($asin === null) {
                continue;
            }

            // preg_match sets $ratingMatch to [] (not null) on no match, so
            // the match is judged by the return value, never by inspecting
            // $ratingMatch's nullness - that check silently passed on every
            // no-match block and read $ratingMatch[1] as an undefined index.
            $hasRating = preg_match('/(\d[,.]\d)\s*von\s*5\s*Sternen/i', $block, $ratingMatch) === 1;
            $price = $this->parsePrice($block);
            if (!$hasRating && $price === null) {
                // Nothing usable on this block at all - a rating and a price
                // are the only two things this client ever reads.
                continue;
            }

            $candidates[] = [
                'title' => $title,
                'url' => 'https://www.amazon.de/dp/' . $asin,
                'rating' => $hasRating ? (float) str_replace(',', '.', $ratingMatch[1]) : null,
                'count' => $hasRating ? $this->parseCount($block) : null,
                'price' => $price,
            ];
        }

        return $candidates;
    }

    // The real selling price and a struck-through UVP list price share the
    // "a-price" class - amazon.de tells them apart with data-a-color ("base"
    // vs "secondary"), which this keys on rather than position, since a
    // discounted listing shows the UVP first in the markup.
    private function parsePrice(string $block): ?float
    {
        // amazon.de renders a non-breaking space (\xa0) between the number
        // and the euro sign, not a regular one - \s alone (no /u modifier
        // here) does not match it, and would silently miss every real price.
        if (!preg_match('/<span class="a-price" data-a-size="[^"]*" data-a-color="base"><span class="a-offscreen">([\d.,]+)[\s\xc2\xa0]*€/', $block, $m)) {
            return null;
        }
        return (float) str_replace(',', '.', $m[1]);
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
