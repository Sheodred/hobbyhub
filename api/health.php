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

// Commander Spellbook answers fine from a dev machine and not at all from
// production (issue #35), and http_get_raw() collapses "DNS never resolved"
// and "403 from their CDN" into the same null - so the one fact needed to
// tell those apart is the one production cannot report. Scryfall is the
// control: it is known to work from here, so a failure on both means the
// host, and a failure on one means that host. Status code and curl's own
// error string only, never a response body.
function probe_outbound(string $url): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'User-Agent: ' . SCRYFALL_USER_AGENT],
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $result = [
        'httpStatus' => $status,
        'curlError' => curl_error($ch) ?: null,
        'bytes' => $body === false ? null : strlen($body),
        // Only on failure, and only the first 200 characters: a rejection
        // usually explains itself ("api key required", a WAF block id), and
        // that sentence is the difference between fixing this and guessing
        // at it. Success bodies stay out - they are just card data.
        'bodySnippet' => $status >= 400 && is_string($body) ? substr($body, 0, 200) : null,
    ];
    curl_close($ch);

    return $result;
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
        // Three Commander Spellbook probes, narrowing from the exact call the
        // combo lookup makes to the barest possible request to the same host:
        // if all three are 403 the host is blocked, if only the query one is,
        // something about the query trips a rule at their edge.
        'outbound' => [
            'commanderSpellbook' => probe_outbound(COMMANDER_SPELLBOOK_BASE_URL . '/variants/?q=' . rawurlencode('card:"Sol Ring"') . '&limit=1'),
            'commanderSpellbookNoQuery' => probe_outbound(COMMANDER_SPELLBOOK_BASE_URL . '/variants/?limit=1'),
            'commanderSpellbookRoot' => probe_outbound(COMMANDER_SPELLBOOK_BASE_URL . '/'),
            'scryfall' => probe_outbound(SCRYFALL_BASE_URL . '/cards/random'),
        ],
    ]);
} catch (Throwable $e) {
    error_log('health checks failed: ' . $e->getMessage());
    json_response(['status' => 'error'], 500);
}
