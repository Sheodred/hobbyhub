<?php
require_once __DIR__ . '/db.php';

// Six clients had this same sixteen lines privately, differing only in the
// table name, and no test could reach any of them. One implementation, one
// test, six one-line callers.
//
// $table is interpolated into SQL directly - only ever call this with a
// hardcoded literal, never with user input, same rule as cache_aside().
//
// Each source keeps its own interval (BGG asks for ~2 req/sec, Amazon is
// deliberately slower); the pacing policy stays with the client, only the
// waiting moves here.
//
// ponytail: keeps the six existing single-row tables rather than one table
// keyed by source, so this needs no production migration. Consolidate them if
// a seventh source ever makes the table-per-source count annoying.
function throttle(string $table, int $minIntervalMs): void
{
    $pdo = db();
    $row = $pdo->query("SELECT last_call_at FROM $table WHERE id = 1")->fetch();

    if ($row) {
        $elapsedMs = (microtime(true) - (float) $row['last_call_at']) * 1000;
        if ($elapsedMs < $minIntervalMs) {
            usleep((int) (($minIntervalMs - $elapsedMs) * 1000));
        }
    }

    $now = microtime(true);
    $pdo->prepare(
        "INSERT INTO $table (id, last_call_at) VALUES (1, ?) ON DUPLICATE KEY UPDATE last_call_at = ?"
    )->execute([$now, $now]);
}
