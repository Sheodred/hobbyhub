<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/EdhrecComboClient.php';

$cardName = trim($_GET['cardName'] ?? '');
if ($cardName === '') {
    error_response('cardName is required', 400);
}

try {
    $combos = (new EdhrecComboClient())->findCombos($cardName);
} catch (Throwable $e) {
    error_log($e->getMessage());
    $combos = null;
}

// A failed lookup used to answer [] like a card with no combos does, which
// made an outage indistinguishable from an empty result - in either case the
// panel just vanished (issue #35). Say which one it is; the panel keeps
// staying quiet for a genuine [].
if ($combos === null) {
    error_response('combo lookup failed', 502);
}

json_response($combos);
