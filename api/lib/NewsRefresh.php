<?php
// Extracted from cron/refresh_news.php so it can be unit-tested without
// executing the cron script's own top-level network calls.
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
