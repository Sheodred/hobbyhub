<?php
require_once __DIR__ . '/ReplaceRows.php';

// Extracted from cron/refresh_news.php so it can be unit-tested without
// executing the cron script's own top-level network calls.
function replace_news(PDO $pdo, string $source, array $items): void
{
    replace_rows(
        $pdo,
        'news_items',
        'source',
        $source,
        ['source', 'headline', 'teaser', 'url', 'published_at', 'latitude', 'longitude', 'sort_order'],
        $items,
        function (array $item, int $i) use ($source) {
            $publishedAt = $item['publishedAt'] ? date('Y-m-d H:i:s', strtotime($item['publishedAt'])) : null;
            return [$source, $item['headline'], $item['teaser'], $item['url'], $publishedAt, $item['latitude'] ?? null, $item['longitude'] ?? null, $i];
        }
    );
}
