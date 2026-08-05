<?php
require_once __DIR__ . '/http_client.php';

// Unofficial-but-documented Tagesschau API (github.com/bundesAPI/tagesschau-api).
// Free, keyless, private/non-commercial use only, capped at 60 req/hour -
// only called from cron/refresh_news.php on a schedule, never live per page view.
class TagesschauClient
{
    private const MAX_ITEMS = 5;

    public function fetchLatest(): array
    {
        // No trailing slash - this endpoint 308-redirects
        // "/api2u/homepage/" to "/api2u/homepage". http_get_json always
        // follows redirects, but the path is written correctly here to
        // avoid the extra round-trip.
        $json = http_get_json(TAGESSCHAU_BASE_URL . '/api2u/homepage');
        if ($json === null) {
            // A genuine request failure - let the caller decide whether to
            // keep the existing cache (see cron/refresh_news.php).
            throw new RuntimeException('Tagesschau request failed');
        }

        $items = [];
        foreach (array_slice($json['news'] ?? [], 0, self::MAX_ITEMS) as $item) {
            $items[] = [
                'headline' => $item['title'] ?? '',
                'teaser' => $item['firstSentence'] ?? null,
                'url' => $item['shareURL'] ?? null,
                'publishedAt' => $item['date'] ?? null,
            ];
        }
        return $items;
    }
}
