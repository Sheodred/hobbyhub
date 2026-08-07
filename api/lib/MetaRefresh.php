<?php
require_once __DIR__ . '/ReplaceRows.php';

// Extracted from cron/refresh_mtg_meta.php so it can be unit-tested without
// executing the cron script's own top-level network calls.
function replace_meta(PDO $pdo, string $category, array $items): void
{
    replace_rows(
        $pdo,
        'mtg_meta_entries',
        'category',
        $category,
        ['category', 'name', 'url', 'num_decks', 'sort_order'],
        $items,
        fn(array $item, int $i) => [$category, $item['name'], $item['url'], $item['numDecks'], $i]
    );
}
