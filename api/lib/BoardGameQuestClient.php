<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/Throttle.php';
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';
require_once __DIR__ . '/RatingSource.php';

// Reads Board Game Quest's own review verdict for a game: their score out of
// five, a short "how it plays" blurb, and their Hits/Misses bullets
// (docs/adr/0013).
//
// Uses their public WordPress REST API rather than scraping rendered pages -
// structured JSON, no markup guessing. boardgamequest.com/robots.txt
// disallows only /wp-admin/, checked 2026-08-15.
//
// Everything shown is an excerpt with a link back to the full review: the
// rules blurb is truncated to RULES_MAX_LENGTH, and the bullets are the short
// phrases they already write as a summary. This site is not a mirror of their
// reviews - it points at them.
class BoardGameQuestClient implements RatingSource
{
    public const RULES_MAX_LENGTH = 320;

    private const CACHE_TTL_SECONDS = 14 * 24 * 60 * 60; // reviews don't change
    // A game they haven't reviewed *yet* may be reviewed next month, so an
    // empty answer is held for days rather than weeks.
    private const MISS_TTL_SECONDS = 3 * 24 * 60 * 60;
    private const THROTTLE_MIN_INTERVAL_MS = 1000;
    private const API_URL = 'https://www.boardgamequest.com/wp-json/wp/v2/posts';

    /** @var callable */
    private $httpGetJson;

    public function __construct(?callable $httpGetJson = null)
    {
        $this->httpGetJson = $httpGetJson ?? 'http_get_json';
    }

    /**
     * @return array{score:float,rules:string,hits:string[],misses:string[],title:string,url:string}|null
     */
    public function label(): string
    {
        return 'Board Game Quest';
    }

    // Their Final Score is out of 5, and they publish no count - one
    // reviewer, one verdict.
    public function rating(string $gameName): ?array
    {
        $found = $this->reviewFor($gameName);

        return $found === null ? null : [
            'value' => $found['score'],
            'max' => 5,
            'count' => null,
            'title' => $found['title'],
            'url' => $found['url'],
        ];
    }

    public function reviewFor(string $gameName): ?array
    {
        $normalized = strtolower(trim($gameName));
        if ($normalized === '') {
            return null;
        }

        return cache_aside('bgq_review_cache', 'query_key', $normalized, self::CACHE_TTL_SECONDS, function () use ($gameName) {
            $this->throttle();
            $posts = ($this->httpGetJson)(self::API_URL . '?' . http_build_query([
                'search' => $gameName,
                'per_page' => 10,
                '_fields' => 'link,title,content',
            ]));
            if (!is_array($posts)) {
                // The call failed. Returning null here would be cached as
                // "they have no review for this game" - see Cache.php.
                throw new RuntimeException('Board Game Quest request failed for ' . $gameName);
            }
            return $this->pickReview($posts, $gameName);
        }, self::MISS_TTL_SECONDS);
    }

    /** @param array<int,array> $posts */
    private function pickReview(array $posts, string $gameName): ?array
    {
        $terms = $this->significantTerms($gameName);
        if ($terms === []) {
            return null;
        }

        foreach ($posts as $post) {
            $title = $this->plainText($post['title']['rendered'] ?? '');
            if (!$this->isReviewOf($title, $gameName)) {
                continue;
            }
            $body = $this->plainText($post['content']['rendered'] ?? '');
            // A round-up ("Top 10 games we disagree on") can name the game in
            // its title while reviewing nothing. The Final Score line is what
            // makes a post a review.
            if (!preg_match('/Final Score:\s*([\d.]+)\s*Stars?/i', $body, $score)) {
                continue;
            }

            return [
                'score' => (float) $score[1],
                'rules' => $this->section($body, 'Gameplay Overview'),
                'hits' => $this->bullets($body, 'Hits'),
                'misses' => $this->bullets($body, 'Misses'),
                'title' => $title,
                'url' => (string) ($post['link'] ?? ''),
            ];
        }

        return null;
    }

    // Text between "<label>:" and whichever known section header comes next.
    private function section(string $body, string $label): string
    {
        if (!preg_match('/' . preg_quote($label, '/') . ':\s*(.+)$/is', $body, $m)) {
            return '';
        }
        $text = $m[1];
        if (preg_match('/(Components|Final Score|Final Thoughts|Hits|Misses)\s*:/i', $text, $stop, PREG_OFFSET_CAPTURE)) {
            $text = substr($text, 0, $stop[0][1]);
        }
        $text = trim(preg_replace('/\s+/', ' ', $text));

        return mb_strlen($text) <= self::RULES_MAX_LENGTH
            ? $text
            : rtrim(mb_substr($text, 0, self::RULES_MAX_LENGTH)) . '…';
    }

    /** @return string[] */
    private function bullets(string $body, string $label): array
    {
        $section = $this->section($body, $label);
        if ($section === '') {
            return [];
        }
        $parts = array_map('trim', preg_split('/[•·]/u', $section) ?: []);
        return array_values(array_filter($parts, fn(string $p) => $p !== ''));
    }

    private function plainText(string $html): string
    {
        return trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES)));
    }

    /** @return string[] */
    private function significantTerms(string $gameName): array
    {
        $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($gameName), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        return array_values(array_filter($words, fn(string $w) => mb_strlen($w) >= 3));
    }

    // Strict on purpose: the post title with a trailing "Review" removed must
    // BE the game, not merely contain it. "Wingspan Pocket Review" and "Azul
    // Duel Review" are reviews of different products, and showing either as
    // the game's verdict would be a wrong answer wearing a real citation.
    // The cost is coverage - BGQ simply hasn't reviewed some classics - and
    // no panel is the honest result there.
    private function isReviewOf(string $title, string $gameName): bool
    {
        $core = preg_replace('/\s*Reviews?\s*$/i', '', $title);
        return $this->normalizeTitle($core) === $this->normalizeTitle($gameName);
    }

    private function normalizeTitle(string $value): string
    {
        return trim(preg_replace('/[^\p{L}\p{N}]+/u', ' ', mb_strtolower($value)));
    }

    private function throttle(): void
    {
        throttle('bgq_throttle', self::THROTTLE_MIN_INTERVAL_MS);
    }
}
