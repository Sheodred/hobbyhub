<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/Throttle.php';
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';
require_once __DIR__ . '/RatingSource.php';

// Reads brettspiele-report.de's overall score for a game (docs/adr/0014),
// via their public WordPress REST API rather than rendered pages.
//
// Their reviews end in a block of category scores followed by a single
// "Bewertung: <n>" line, which is the overall verdict. Only that line is
// taken - the categories above it (Anspruch, Gedächtnis, Komplexität,
// Zufall) are descriptors, not quality marks, and averaging them would
// invent a number the site never published.
class BrettspieleReportClient implements RatingSource
{
    // Not stated on the page. Inferred: 25 sampled reviews score 8-18
    // overall and category values reach 19, with none above 20.
    public const MAX_RATING = 20;

    private const CACHE_TTL_SECONDS = 14 * 24 * 60 * 60;
    // An unreviewed game may be reviewed next month - days, not weeks.
    private const MISS_TTL_SECONDS = 3 * 24 * 60 * 60;
    private const THROTTLE_MIN_INTERVAL_MS = 1000;
    private const API_URL = 'https://www.brettspiele-report.de/wp-json/wp/v2/posts';

    /** @var callable */
    private $httpGetJson;

    public function __construct(?callable $httpGetJson = null)
    {
        $this->httpGetJson = $httpGetJson ?? 'http_get_json';
    }

    /**
     * @return array{rating:int,max:int,complexity:?int,title:string,url:string}|null
     */
    public function label(): string
    {
        return 'brettspiele-report';
    }

    // Out of 20 - the widest scale of the four, and the clearest reason not
    // to average them.
    public function rating(string $gameName): ?array
    {
        $found = $this->ratingFor($gameName);

        return $found === null ? null : [
            'value' => $found['rating'],
            'max' => $found['max'],
            'count' => null,
            'title' => $found['title'],
            'url' => $found['url'],
        ];
    }

    public function ratingFor(string $gameName): ?array
    {
        $normalized = mb_strtolower(trim($gameName));
        if ($normalized === '') {
            return null;
        }

        return cache_aside('brettspiele_report_cache', 'query_key', $normalized, self::CACHE_TTL_SECONDS, function () use ($gameName) {
            $this->throttle();
            $posts = ($this->httpGetJson)(self::API_URL . '?' . http_build_query([
                'search' => $gameName,
                'per_page' => 10,
                '_fields' => 'link,title,content',
            ]));
            if (!is_array($posts)) {
                // Failed call. A null here would be cached as "they never
                // reviewed this game" - see Cache.php.
                throw new RuntimeException('brettspiele-report request failed for ' . $gameName);
            }
            return $this->pick($posts, $gameName);
        }, self::MISS_TTL_SECONDS);
    }

    /** @param array<int,array> $posts */
    private function pick(array $posts, string $gameName): ?array
    {
        foreach ($posts as $post) {
            $title = $this->plainText($post['title']['rendered'] ?? '');
            // Same strictness as BoardGameQuestClient: "Azul - Der
            // Sommerpavillon" is a different game from "Azul", and its score
            // must never be shown as Azul's.
            if ($this->normalize($title) !== $this->normalize($gameName)) {
                continue;
            }
            $body = $this->plainText($post['content']['rendered'] ?? '');
            // The overall line is the LAST "Bewertung:" in the block; the
            // heading above it ("brettspiele-report Bewertung <game>") has no
            // number after it.
            if (!preg_match_all('/Bewertung:\s*(\d{1,2})\b/iu', $body, $m)) {
                continue;
            }
            $rating = (int) end($m[1]);
            if ($rating <= 0 || $rating > self::MAX_RATING) {
                continue;
            }

            return [
                'rating' => $rating,
                'max' => self::MAX_RATING,
                // Komplexität is the one category worth reading on its own: it
                // describes how heavy the game is, not how good it is, so it
                // travels as a fact about the game rather than through the
                // RatingSource seam. Same 20-point scale as the verdict above.
                'complexity' => $this->category($body, 'Komplexität'),
                'title' => $title,
                'url' => (string) ($post['link'] ?? ''),
            ];
        }

        return null;
    }

    // A single "<label>: <n>" from the category block. Null when the review
    // doesn't carry it - not every review scores every category.
    private function category(string $body, string $label): ?int
    {
        if (!preg_match('/' . preg_quote($label, '/') . ':\s*(\d{1,2})\b/iu', $body, $m)) {
            return null;
        }
        $value = (int) $m[1];

        return ($value > 0 && $value <= self::MAX_RATING) ? $value : null;
    }

    private function plainText(string $html): string
    {
        return trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES)));
    }

    private function normalize(string $value): string
    {
        return trim(preg_replace('/[^\p{L}\p{N}]+/u', ' ', mb_strtolower($value)));
    }

    private function throttle(): void
    {
        throttle('brettspiele_report_throttle', self::THROTTLE_MIN_INTERVAL_MS);
    }
}
