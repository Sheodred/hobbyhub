<?php
require_once __DIR__ . '/lib/http.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/http_client.php';

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

// Combos come from a third-party host that answered fine from a dev machine
// and not at all from production once already (issue #35), so this reports
// which. Scryfall is the control: it is known to work from here, so a failure
// on both means the host, and a failure on one means that host.
//
// This used to be a second curl implementation living beside the real one;
// it now asks the same module every client uses, which is the only way the
// answer is worth anything.
function probe_outbound(string $url): array
{
    $result = http_get_result($url, 8, ['Accept: application/json', 'User-Agent: ' . SCRYFALL_USER_AGENT]);
    $body = $result['body'];

    return [
        'httpStatus' => $result['status'],
        'curlError' => $result['error'],
        'bytes' => $body === null ? null : strlen($body),
        // Only on failure, and only the first 200 characters: a rejection
        // usually explains itself ("api key required", a WAF block id), and
        // that sentence is the difference between fixing this and guessing
        // at it. Success bodies stay out - they are just card data.
        'bodySnippet' => $result['status'] >= 400 && $body !== null ? substr($body, 0, 200) : null,
    ];
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
    $present = array_merge($present, $pdo->query("SHOW TABLES LIKE 'm%'")->fetchAll(PDO::FETCH_COLUMN));

    $missing = array_values(array_diff($required, $present));
    $deckTablesMissing = array_values(array_diff(['mtg_decks', 'mtg_deck_cards'], $present));
    $ranksRows = in_array('bgg_ranks', $present, true)
        ? (int) $pdo->query('SELECT COUNT(*) FROM bgg_ranks')->fetchColumn()
        : null;

    json_response([
        'status' => $missing === [] && $ranksRows > 0 ? 'ok' : 'incomplete',
        'boardgameTablesMissing' => $missing,
        'bggRanksRows' => $ranksRows,
        'deckTablesMissing' => $deckTablesMissing,
        // The exact call the combo lookup makes, for a card that is certain to
        // be in combos - a 403 here means either the host is blocking us again
        // or the slug was wrong, and the snippet says which.
        'outbound' => [
            'edhrecCombos' => probe_outbound(EDHREC_JSON_BASE_URL . '/pages/combos/sol-ring.json'),
            'scryfall' => probe_outbound(SCRYFALL_BASE_URL . '/cards/random'),
        ],
    ]);
} catch (Throwable $e) {
    error_log('health checks failed: ' . $e->getMessage());
    json_response(['status' => 'error'], 500);
}
