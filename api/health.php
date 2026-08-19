<?php
require_once __DIR__ . '/lib/http.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/http_client.php';
require_once __DIR__ . '/lib/AmazonRatingClient.php';

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
// $headers is per-probe because a probe sent with the wrong content
// negotiation measures a different request than the one that fails. amazon.de
// answers a request with no Accept/Accept-Language with its generic error
// page, so probing it as JSON would produce a failure that tells us nothing
// about the real client's failure (#165).
function probe_outbound(string $url, array $headers = ['Accept: application/json']): array
{
    $result = http_get_result($url, 8, array_merge($headers, ['User-Agent: ' . SCRYFALL_USER_AGENT]));
    $body = $result['body'];

    return [
        'httpStatus' => $result['status'],
        'curlError' => $result['error'],
        'bytes' => $body === null ? null : strlen($body),
        // The first 200 characters, on success as well as failure. This used
        // to be failure-only, on the reasoning that a success body is just
        // card data - which #165 disproved: amazon.de's anti-bot interstitial
        // is served with a 200, so a status-only view of it looks healthy.
        // The whole point of this probe is to tell a real page from a block
        // wearing a 200, and only the body can do that.
        'bodySnippet' => $body === null ? null : substr($body, 0, 200),
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
            // #165: the retail price and the amazon.de rating both come from
            // this one search request, and both return nothing on production
            // while the identical request succeeds from outside IONOS. The
            // other two probes above are the control: they answer 200 from
            // here, so outbound HTTPS works and whatever this reports is
            // amazon-specific.
            //
            // Same URL and same headers as AmazonRatingClient::candidatesFor()
            // so this measures that request, not a lookalike. It deliberately
            // skips the 2s throttle - ?checks=1 is a manual call, not traffic.
            //
            // Reading it: 200 plus a bodySnippet containing "s-search-result"
            // is a real page; 200 with anything else is the interstitial, and
            // that is the answer the issue is missing.
            'amazon' => probe_outbound(
                AmazonRatingClient::SEARCH_URL . '?' . http_build_query(['k' => 'catan brettspiel']),
                ['Accept: text/html,application/xhtml+xml', 'Accept-Language: de-DE,de;q=0.9']
            ),
        ],
    ]);
} catch (Throwable $e) {
    error_log('health checks failed: ' . $e->getMessage());
    json_response(['status' => 'error'], 500);
}
