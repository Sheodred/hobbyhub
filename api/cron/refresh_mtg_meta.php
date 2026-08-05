<?php
// WebCron target, run every 4 hours. Refreshes all four MTG Meta & Stats
// categories - EDHREC failures keep the existing cache (EdhrecClient
// throws on a genuine request failure); MTGGoldfish failures replace the
// cache with "no data" (MtgGoldfishClient catches its own errors and
// returns an empty array), matching each client's documented behavior.
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/MetaRefresh.php';
require_once __DIR__ . '/../lib/EdhrecClient.php';
require_once __DIR__ . '/../lib/MtgGoldfishClient.php';

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
