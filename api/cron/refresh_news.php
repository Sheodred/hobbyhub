<?php
// WebCron target, run every 20 minutes - well within Tagesschau's
// documented 60 req/hour cap. Fetches Tagesschau and WotC news; a failed
// fetch leaves the previous cache in place rather than wiping the panel
// (see each *Client class for exactly what "failed" means per source).
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/TagesschauClient.php';
require_once __DIR__ . '/../lib/WotcNewsClient.php';

function replace_news(PDO $pdo, string $source, array $items): void
{
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM news_items WHERE source = ?')->execute([$source]);

        $insert = $pdo->prepare(
            'INSERT INTO news_items (source, headline, teaser, url, published_at, fetched_at, sort_order) ' .
            'VALUES (?, ?, ?, ?, ?, NOW(), ?)'
        );
        foreach ($items as $i => $item) {
            $publishedAt = $item['publishedAt'] ? date('Y-m-d H:i:s', strtotime($item['publishedAt'])) : null;
            $insert->execute([$source, $item['headline'], $item['teaser'], $item['url'], $publishedAt, $i]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

$pdo = db();

try {
    $items = (new TagesschauClient())->fetchLatest();
    replace_news($pdo, 'TAGESSCHAU', $items);
} catch (Throwable $e) {
    error_log('Tagesschau refresh failed - keeping the existing cache: ' . $e->getMessage());
}

try {
    $items = (new WotcNewsClient())->fetchLatest();
    if (empty($items)) {
        // Scraper found nothing (or failed outright) - fall back to the
        // manual, phpMyAdmin-editable list rather than leaving an empty panel.
        $fallback = $pdo->query('SELECT headline, url, sort_order FROM wotc_news_fallback ORDER BY sort_order ASC');
        $items = array_map(function ($row) {
            return ['headline' => $row['headline'], 'teaser' => null, 'url' => $row['url'], 'publishedAt' => null];
        }, $fallback->fetchAll());
    }
    replace_news($pdo, 'WOTC', $items);
} catch (Throwable $e) {
    error_log('WotC news refresh failed - keeping the existing cache: ' . $e->getMessage());
}

echo "done\n";
