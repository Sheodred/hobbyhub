<?php
require_once __DIR__ . '/lib/http.php';
require_once __DIR__ . '/lib/db.php';

// Deploy's smoke test asserts this body is exactly {"status":"ok"}, so the
// bare form stays the default. ?checks=1 adds a schema readiness report,
// because production can only be inspected through HTTP - the IONOS database
// host is not resolvable from outside their network, so a failing endpoint
// there is otherwise indistinguishable between "table missing" and "table
// empty" (both surface as the same 502).
//
// Reports table presence and one row count. No data, no credentials, no
// schema definitions.
if (($_GET['checks'] ?? '') === '') {
    json_response(['status' => 'ok']);
}

$required = [
    'bgg_lookup_cache', 'bgg_search_cache', 'bgg_ranks', 'bgg_throttle',
    'bgq_review_cache', 'bgq_throttle',
    'amazon_rating_cache', 'amazon_throttle',
    'hall9000_cache', 'hall9000_throttle',
    'brettspiele_report_cache', 'brettspiele_report_throttle',
];

try {
    $pdo = db();
    $present = $pdo->query("SHOW TABLES LIKE 'b%'")->fetchAll(PDO::FETCH_COLUMN);
    $present = array_merge($present, $pdo->query("SHOW TABLES LIKE 'a%'")->fetchAll(PDO::FETCH_COLUMN));
    $present = array_merge($present, $pdo->query("SHOW TABLES LIKE 'h%'")->fetchAll(PDO::FETCH_COLUMN));

    $missing = array_values(array_diff($required, $present));
    $ranksRows = in_array('bgg_ranks', $present, true)
        ? (int) $pdo->query('SELECT COUNT(*) FROM bgg_ranks')->fetchColumn()
        : null;

    json_response([
        'status' => $missing === [] && $ranksRows > 0 ? 'ok' : 'incomplete',
        'boardgameTablesMissing' => $missing,
        'bggRanksRows' => $ranksRows,
    ]);
} catch (Throwable $e) {
    error_log('health checks failed: ' . $e->getMessage());
    json_response(['status' => 'error'], 500);
}
