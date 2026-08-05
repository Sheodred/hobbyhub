<?php
// WebCron target, run every 4 hours. Refreshes all four MTG Meta & Stats
// categories - EDHREC failures keep the existing cache (EdhrecClient
// throws on a genuine request failure); MTGGoldfish failures replace the
// cache with "no data" (MtgGoldfishClient catches its own errors and
// returns an empty array), matching each client's documented behavior.
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/EdhrecClient.php';
require_once __DIR__ . '/../lib/MtgGoldfishClient.php';

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

$pdo = db();
$edhrec = new EdhrecClient();
$goldfish = new MtgGoldfishClient();

$jobs = [
    'MOST_PLAYED_CARDS' => fn() => $edhrec->mostPlayedCards(),
    'POPULAR_COMMANDER_DECKS' => fn() => $edhrec->popularCommanderDecks(),
    'STANDARD_DECKS' => fn() => $goldfish->standardDecks(),
    'COMMANDER_DECKS' => fn() => $goldfish->commanderDecks(),
];

foreach ($jobs as $category => $fetch) {
    try {
        replace_meta($pdo, $category, $fetch());
    } catch (Throwable $e) {
        error_log("MTG meta refresh failed for $category - keeping the existing cache: " . $e->getMessage());
    }
}

echo "done\n";
