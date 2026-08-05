<?php
// Extracted from cron/refresh_mtg_meta.php so it can be unit-tested without
// executing the cron script's own top-level network calls.
function replace_meta(PDO $pdo, string $category, array $items): void
{
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM mtg_meta_entries WHERE category = ?')->execute([$category]);

        $insert = $pdo->prepare(
            'INSERT INTO mtg_meta_entries (category, name, url, num_decks, sort_order, fetched_at) ' .
            'VALUES (?, ?, ?, ?, ?, NOW())'
        );
        foreach ($items as $i => $item) {
            $insert->execute([$category, $item['name'], $item['url'], $item['numDecks'], $i]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
