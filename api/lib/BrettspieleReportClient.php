<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http_client.php';
require_once __DIR__ . '/Cache.php';

// Reads brettspiele-report.de's overall score for a game (docs/adr/0014),
// via their public WordPress REST API rather than rendered pages.
//
// Their reviews end in a block of category scores followed by a single
// "Bewertung: <n>" line, which is the overall verdict. Only that line is
// taken - the categories above it (Anspruch, Gedächtnis, Komplexität,
// Zufall) are descriptors, not quality marks, and averaging them would
// invent a number the site never published.
class BrettspieleReportClient
{
    // Not stated on the page. Inferred: 25 sampled reviews score 8-18
    // overall and category values reach 19, with none above 20.
    public const MAX_RATING = 20;

    private const CACHE_TTL_SECONDS = 14 * 24 * 60 * 60;
    private const THROTTLE_MIN_INTERVAL_MS = 1000;
    private const API_URL = 'https://www.brettspiele-report.de/wp-json/wp/v2/posts';

    /** @var callable */
    private $httpGetJson;

    public function __construct(?callable $httpGetJson = null)
    {
        $this->httpGetJson = $httpGetJson ?? 'http_get_json';
    }

    /**
     * @return array{rating:int,max:int,title:string,url:string}|null
     */
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
            return is_array($posts) ? $this->pick($posts, $gameName) : null;
        });
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
                'title' => $title,
                'url' => (string) ($post['link'] ?? ''),
            ];
        }

        return null;
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
        $pdo = db();
        $row = $pdo->query('SELECT last_call_at FROM brettspiele_report_throttle WHERE id = 1')->fetch();

        $now = microtime(true);
        if ($row) {
            $elapsedMs = ($now - (float) $row['last_call_at']) * 1000;
            if ($elapsedMs < self::THROTTLE_MIN_INTERVAL_MS) {
                usleep((int) ((self::THROTTLE_MIN_INTERVAL_MS - $elapsedMs) * 1000));
            }
        }

        $now = microtime(true);
        $stmt = $pdo->prepare(
            'INSERT INTO brettspiele_report_throttle (id, last_call_at) VALUES (1, ?) ON DUPLICATE KEY UPDATE last_call_at = ?'
        );
        $stmt->execute([$now, $now]);
    }
}
